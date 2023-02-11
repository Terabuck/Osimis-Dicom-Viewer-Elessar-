#include "LanguageController.h"

#include <memory>
#include <string>
#include <boost/regex.hpp>
#include <boost/lexical_cast.hpp> // to retrieve exception error code for log
#include <Core/OrthancException.h>

#include <json/json.h>
#include <json/reader.h>
#include <json/value.h>

#include "../OrthancContextManager.h"
#include "../Image/Utilities/ScopedBuffers.h"


LanguageController::LanguageController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request)
  : BaseController(response, url, request)
{

}

int LanguageController::_ParseURLPostFix(const std::string& urlPostfix) {
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
    // /osimis-viewer/languages/<language_id>
    boost::regex regexp("^([^/]+)$");

    // Parse URL
    boost::cmatch matches;
    if (!boost::regex_match(urlPostfix.c_str(), matches, regexp)) {
      // Return 404 error on badly formatted URL - @todo use ErrorCode_UriSyntax instead
      return this->_AnswerError(404);
    }
    else {
      // Store StudyId
      this->languageId_ = matches[1];

      return 200;
    }
  }
  catch (const Orthanc::OrthancException& exc) {
    // Log detailed Orthanc error.
    std::string message("(LanguageController) Orthanc::OrthancException during URL parsing ");
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
    std::string message("(LanguageController) std::exception during URL parsing ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(LanguageController) std::string during URL parsing ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(LanguageController) Unknown Exception during URL parsing");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}

// merges all values from b into a
void MergeJson(Json::Value& a, const Json::Value& b)
{
  assert(b.isObject());
  Json::Value::Members bMemberNames = b.getMemberNames();

  for (Json::Value::Members::const_iterator it = bMemberNames.begin(); it != bMemberNames.end(); it++)
  {
    if (b[*it].isObject() && a.isMember(*it))
      MergeJson(a[*it], b[*it]);
    else // if a does not have this member yet (or the member is a value), copy it from b
      a[*it] = b[*it];
  }
}

int LanguageController::_ProcessRequest()
{
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
    if (languageFiles_.find(languageId_) == languageFiles_.end())
      return this->_AnswerError(404);

    Json::Value mergedLanguageFile;
    for (LanguageFilesList::const_iterator it = languageFiles_[languageId_].begin(); it != languageFiles_[languageId_].end(); it++)
    {
      ScopedOrthancPluginMemoryBuffer buffer(context);
      Orthanc::ErrorCode error = static_cast<Orthanc::ErrorCode>(OrthancPluginRestApiGetAfterPlugins(context, buffer.getPtr(), it->c_str()));
      if (error != Orthanc::ErrorCode_Success)
        throw Orthanc::OrthancException(error);

      // Parse attachment as JSON
      Json::Value languageFile;
      std::string bufferStr = std::string(buffer.getDataChar(), buffer.getSize());
      Json::Reader reader;

      // Throw exception on malformatted json
      if (!reader.parse(bufferStr, languageFile)) {
        throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
      }

      // Merge language files
      MergeJson(mergedLanguageFile, languageFile);
    }

    return this->_AnswerBuffer(mergedLanguageFile);
  }
  // @note if the exception has been thrown from some constructor,
  // memory leaks may happen. we should fix the bug instead of focusing on those memory leaks.
  // however, in case of memory leak due to bad alloc, we should clean memory.
  // @todo avoid memory allocation within constructor
  catch (const Orthanc::OrthancException& exc) {
    // Log detailed Orthanc error.
    std::string message("(LanguageController) Orthanc::OrthancException ");
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
    std::string message("(LanguageController) std::exception ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(LanguageController) std::string ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(LanguageController) Unknown Exception");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}

LanguageController::LanguageFilesMap LanguageController::languageFiles_;

void LanguageController::addLanguageFile(const std::string& languageId, const std::string& languageFile)
{
  if (languageFiles_.find(languageId) == languageFiles_.end())
  {
    std::vector<std::string> languages;
    languages.push_back(languageFile);
    languageFiles_[languageId] = languages;
  }
  else
  {
    languageFiles_[languageId].push_back(languageFile);
  }
}
