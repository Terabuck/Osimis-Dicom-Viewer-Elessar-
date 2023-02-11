#include "SeriesController.h"

#include <memory>
#include <string>
#include <boost/regex.hpp>
#include <boost/lexical_cast.hpp> // to retrieve exception error code for log
#include <Core/OrthancException.h>

#include "../BenchmarkHelper.h" // for BENCH(*)
#include "../OrthancContextManager.h"
#include "ViewerToolbox.h"
#include "Config/WebViewerConfiguration.h"


SeriesRepository* SeriesController::seriesRepository_ = NULL;
const WebViewerConfiguration* SeriesController::_config = NULL;

template<>
void SeriesController::Inject<SeriesRepository>(SeriesRepository* obj) {
  SeriesController::seriesRepository_ = obj;
}

SeriesController::SeriesController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request)
  : BaseController(response, url, request)
{

}

int SeriesController::_ParseURLPostFix(const std::string& urlPostfix) {
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
    // /osimis-viewer/series/<series_uid>
    boost::regex regexp("^([^/]+)$");

    // Parse URL
    boost::cmatch matches;
    if (!boost::regex_match(urlPostfix.c_str(), matches, regexp)) {
      // Return 404 error on badly formatted URL - @todo use ErrorCode_UriSyntax instead
      return this->_AnswerError(404);
    }
    else {
      // Store seriesId
      this->seriesId_ = matches[1];

      BENCH_LOG(SERIES_ID, seriesId_);

      return 200;
    }
  }
  catch (const Orthanc::OrthancException& exc) {
    // Log detailed Orthanc error.
    std::string message("(SeriesController) Orthanc::OrthancException during URL parsing ");
    message += boost::lexical_cast<std::string>(exc.GetErrorCode());
    message += "/";
    message += boost::lexical_cast<std::string>(exc.GetHttpStatus());
    message += " ";
    message += exc.What();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(exc.GetHttpStatus());
  }
  catch (const std::exception& exc) {
    // Log detailed std error.
    std::string message("(SeriesController) std::exception during URL parsing ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(SeriesController) std::string during URL parsing ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(SeriesController) Unknown Exception during URL parsing");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}

int SeriesController::_ProcessRequest()
{
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
    BENCH(FULL_PROCESS);

    // Write Log
    std::string message = "Ordering instances of series: " + this->seriesId_;
    OrthancPluginLogInfo(context, message.c_str());
    
    // Load the series with an auto_ptr so it's freed at the end of thit method
    std::auto_ptr<Series> series(seriesRepository_->GetSeries(this->seriesId_));

    // filter out series based on tags
    if (!_config->seriesToIgnore.empty())
    {
      std::string middleInstanceId = series->GetMiddleInstanceId();

      if (!middleInstanceId.empty())
      {
        // get all tags from the middle instance
        Json::Value middleInstanceTags;
        if (OrthancPlugins::GetJsonFromOrthanc(middleInstanceTags, context, "/instances/" + middleInstanceId + "/tags?simplify=true"))
        {
          Json::Value::Members filterNames = _config->seriesToIgnore.getMemberNames();
          for (size_t i = 0; i < filterNames.size(); i++)
          {
            Json::Value filter = _config->seriesToIgnore[filterNames[i]];
            if (filter.type() == Json::objectValue)
            {
              bool allTagsMatching = true;
              Json::Value::Members tagNames = filter.getMemberNames();
              for (size_t j = 0; j < tagNames.size(); j++)
              {
                if (!middleInstanceTags.isMember(tagNames[j]) || middleInstanceTags[tagNames[j]] != filter[tagNames[j]])
                {
                  allTagsMatching = false;
                  break;
                }
              }

              if (allTagsMatching)
              {
                Json::Value modalitySkippedResponse;
                modalitySkippedResponse["skipped"] = true;
                std::string logMessage = std::string("skipping series ") + this->seriesId_ + ", filtered out by the '" + filterNames[i] + "' filter";
                OrthancPluginLogWarning(context, logMessage.c_str());
                return this->_AnswerBuffer(modalitySkippedResponse);
              }

            }
          }
        }
      }
    }

    // filter out series based on metadata
    if (!_config->seriesToIgnoreFromMetadata.empty())
    {
      std::string middleInstanceId = series->GetMiddleInstanceId();

      if (!middleInstanceId.empty())
      {
        // get all metadatas from the middle instance
        Json::Value middleInstanceMetadatas;
        if (OrthancPlugins::GetJsonFromOrthanc(middleInstanceMetadatas, context, "/instances/" + middleInstanceId + "/metadata?expand"))
        {
          Json::Value::Members filterNames = _config->seriesToIgnoreFromMetadata.getMemberNames();
          for (size_t i = 0; i < filterNames.size(); i++)
          {
            Json::Value filter = _config->seriesToIgnoreFromMetadata[filterNames[i]];
            if (filter.type() == Json::objectValue)
            {
              bool allMetadatasMatching = true;
              Json::Value::Members metadataNames = filter.getMemberNames();
              for (size_t j = 0; j < metadataNames.size(); j++)
              {
                if (!middleInstanceMetadatas.isMember(metadataNames[j]) || middleInstanceMetadatas[metadataNames[j]] != filter[metadataNames[j]])
                {
                  allMetadatasMatching = false;
                  break;
                }
              }

              if (allMetadatasMatching)
              {
                Json::Value modalitySkippedResponse;
                modalitySkippedResponse["skipped"] = true;
                std::string logMessage = std::string("skipping series ") + this->seriesId_ + ", filtered out by the '" + filterNames[i] + "' filter";
                OrthancPluginLogWarning(context, logMessage.c_str());
                return this->_AnswerBuffer(modalitySkippedResponse);
              }

            }
          }
        }
      }
    }

    Json::Value seriesInfo;
    series->ToJson(seriesInfo);

    // Answer Request with the series' information as JSON
    return this->_AnswerBuffer(seriesInfo.toStyledString(), "application/json");
  }
  // @note if the exception has been thrown from some constructor,
  // memory leaks may happen. we should fix the bug instead of focusing on those memory leaks.
  // however, in case of memory leak due to bad alloc, we should clean memory.
  // @todo avoid memory allocation within constructor
  catch (const Orthanc::OrthancException& exc) {

    if (exc.GetErrorCode() == Orthanc::ErrorCode_IncompatibleImageFormat)
    {
      Json::Value modalitySkippedResponse;
      modalitySkippedResponse["skipped"] = true;
      std::string logMessage = std::string("skipping series ") + this->seriesId_ + ", unsupported series: '" + exc.GetDetails() + "'";
      OrthancPluginLogWarning(context, logMessage.c_str());
      return this->_AnswerBuffer(modalitySkippedResponse);
    }
    else
    {
      // Log detailed Orthanc error.
      std::string message("(SeriesController) Orthanc::OrthancException ");
      message += boost::lexical_cast<std::string>(exc.GetErrorCode());
      message += "/";
      message += boost::lexical_cast<std::string>(exc.GetHttpStatus());
      message += " ";
      message += exc.What();
      OrthancPluginLogError(context, message.c_str());

      return this->_AnswerError(exc.GetHttpStatus());
    }
  }
  catch (const std::exception& exc) {
    // Log detailed std error.
    std::string message("(SeriesController) std::exception ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(SeriesController) std::string ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(SeriesController) Unknown Exception");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}
