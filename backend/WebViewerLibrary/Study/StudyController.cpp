#include "StudyController.h"

#include <memory>
#include <string>
#include <algorithm>
#include <boost/regex.hpp>
#include <boost/lexical_cast.hpp> // to retrieve exception error code for log
#include <boost/range/algorithm.hpp>
#include <Core/OrthancException.h>
#include <Core/Toolbox.h>

#include "../Annotation/AnnotationRepository.h"
#include "../BenchmarkHelper.h" // for BENCH(*)
#include "../OrthancContextManager.h"
#include "ViewerToolbox.h"

AnnotationRepository* StudyController::annotationRepository_ = NULL;

template<>
void StudyController::Inject<AnnotationRepository>(AnnotationRepository* obj) {
  StudyController::annotationRepository_ = obj;
}

StudyController::StudyController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request)
  : BaseController(response, url, request)
{

}

int StudyController::_ParseURLPostFix(const std::string& urlPostfix) {
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
    // /osimis-viewer/studies/<Study_uid>/annotations
    // /osimis-viewer/studies/<Study_uid>

    boost::regex regexpAnnotations("^([^/]+)/annotations$");
    boost::regex regexpSimpleStudy("^([^/]+)$");

    // Parse URL
    boost::cmatch matches;
    if (!boost::regex_match(urlPostfix.c_str(), matches, regexpAnnotations)) {
      if (!boost::regex_match(urlPostfix.c_str(), matches, regexpSimpleStudy)) {
        // Return 404 error on badly formatted URL - @todo use ErrorCode_UriSyntax instead
        return this->_AnswerError(404);
      } else {
        // Store StudyId
        this->studyId_ = matches[1];
        this->isAnnotationRequest_ = false;

        return 200;
      }
    } else {
      // Store StudyId
      this->studyId_ = matches[1];
      this->isAnnotationRequest_ = true;

      return 200;
    }
  }
  catch (const Orthanc::OrthancException& exc) {
    // Log detailed Orthanc error.
    std::string message("(StudyController) Orthanc::OrthancException during URL parsing ");
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
    std::string message("(StudyController) std::exception during URL parsing ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(StudyController) std::string during URL parsing ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(StudyController) Unknown Exception during URL parsing");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}

int StudyController::ProcessAnnotationRequest(OrthancPluginContext* context)
{
  // Answer 403 Forbidden if annotation storage is disabled
  if (!this->annotationRepository_->isAnnotationStorageEnabled()) {
    return this->_AnswerError(403);
  }
  // Answer Request with the study's annotations as JSON else
  else {
    Json::Value annotations = annotationRepository_->getByStudyId(this->studyId_);
    return this->_AnswerBuffer(annotations);
  }
}

int StudyController::ProcessStudyInfoRequest(OrthancPluginContext* context)
{
  std::vector<std::string> seriesDisplayOrder;
  Json::Value studyInfo;
  OrthancPlugins::GetJsonFromOrthanc(studyInfo, context, "/studies/" + this->studyId_);

  Json::Value studyInfoSeries;
  OrthancPlugins::GetJsonFromOrthanc(studyInfoSeries, context, "/studies/" + this->studyId_ + "/series?expand=true");

  Json::Value seriesDisplayOrderJson;
  if (OrthancPlugins::GetJsonFromOrthanc(seriesDisplayOrderJson, context, "/studies/" + this->studyId_ + "/metadata/seriesDisplayOrder"))
  {
    seriesDisplayOrder.clear();
    for (Json::ArrayIndex i = 0; i < seriesDisplayOrderJson.size(); i++)
    {
      seriesDisplayOrder.push_back(seriesDisplayOrderJson[(int)i].asString());
    }

    for (Json::ArrayIndex i = 0; i < studyInfo["Series"].size(); i++)
    {
      const std::string& seriesId = studyInfo["Series"][(int)i].asString();
      if (boost::range::find(seriesDisplayOrder, seriesId) == seriesDisplayOrder.end()) {
        seriesDisplayOrder.push_back(seriesId);
      }
    }
  } else {
    {// first try to sort series based on the series number
      std::vector<int> seriesNumbers;
      std::map<int, std::vector<std::string> > seriesNumbersToSeriesId;
      seriesDisplayOrder.clear();

      for (Json::ArrayIndex i = 0; i < studyInfoSeries.size(); i++)
      {
        const std::string& seriesId = studyInfoSeries[i]["ID"].asString();
        if (studyInfoSeries[i]["MainDicomTags"].isMember("SeriesNumber"))
        {
          std::string seriesNumberString = Orthanc::Toolbox::StripSpaces(studyInfoSeries[i]["MainDicomTags"]["SeriesNumber"].asString());
          if (Orthanc::Toolbox::IsInteger(seriesNumberString))
          {
            int seriesNumberInt = boost::lexical_cast<int>(seriesNumberString);
            if (seriesNumbersToSeriesId.find(seriesNumberInt) == seriesNumbersToSeriesId.end())
            {
              seriesNumbers.push_back(seriesNumberInt);
              seriesNumbersToSeriesId[seriesNumberInt] = std::vector<std::string>();
            }
            seriesNumbersToSeriesId[seriesNumberInt].push_back(seriesId);
          }
        }
      }

      boost::range::sort(seriesNumbers);

      for (size_t si = 0; si < seriesNumbers.size(); si++)
      {
        const int& seriesNumber = seriesNumbers[si];
        for (size_t sj = 0; sj < seriesNumbersToSeriesId[seriesNumber].size(); sj++)
        {
          const std::string& seriesId = seriesNumbersToSeriesId[seriesNumber][sj];
          seriesDisplayOrder.push_back(seriesId);
        }
      }
    }

    // all series that did not had a SeriesNumber shall be added at the end (and sorted in alphabetical order of their ids (at least, this is reproducible !))
    std::vector<std::string> remainingSeriesIds;
    for (Json::ArrayIndex i = 0; i < studyInfo["Series"].size(); i++)
    {
      const std::string& seriesId = studyInfo["Series"][(int)i].asString();
      if (boost::range::find(seriesDisplayOrder, seriesId) == seriesDisplayOrder.end()) {
        remainingSeriesIds.push_back(seriesId);
      }
    }
    boost::range::sort(remainingSeriesIds);

    for (size_t si = 0; si < remainingSeriesIds.size(); si++)
    {
      const std::string& seriesId = remainingSeriesIds[si];
      seriesDisplayOrder.push_back(seriesId);
    }
  }

  // now, reorder the series in the Json
  studyInfo["Series"] = Json::arrayValue;

  for (size_t i = 0; i < seriesDisplayOrder.size(); i++) {
    studyInfo["Series"].append(seriesDisplayOrder[i]);
  }

  return this->_AnswerBuffer(studyInfo);

}


int StudyController::_ProcessRequest()
{
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
    BENCH(FULL_PROCESS);

    if (this->isAnnotationRequest_) {
      return this->ProcessAnnotationRequest(context);
    } else {
      return this->ProcessStudyInfoRequest(context);
    }
  }
  // @note if the exception has been thrown from some constructor,
  // memory leaks may happen. we should fix the bug instead of focusing on those memory leaks.
  // however, in case of memory leak due to bad alloc, we should clean memory.
  // @todo avoid memory allocation within constructor
  catch (const Orthanc::OrthancException& exc) {
    // Log detailed Orthanc error.
    std::string message("(StudyController) Orthanc::OrthancException ");
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
    std::string message("(StudyController) std::exception ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(StudyController) std::string ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(StudyController) Unknown Exception");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}
