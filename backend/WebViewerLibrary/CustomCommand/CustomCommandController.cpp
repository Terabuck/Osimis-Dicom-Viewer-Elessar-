#include "CustomCommandController.h"

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
#include "Config/WebViewerConfiguration.h"

const WebViewerConfiguration* CustomCommandController::_config = NULL;


CustomCommandController::CustomCommandController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request)
  : BaseController(response, url, request)
{

}

int CustomCommandController::_ParseURLPostFix(const std::string& urlPostfix) {
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
    // /osimis-viewer/custom-command/<instance_uid>
    boost::regex regexp("^([^/]+)$");

    // Parse URL
    boost::cmatch matches;
    if (!boost::regex_match(urlPostfix.c_str(), matches, regexp)) {
      // Return 404 error on badly formatted URL - @todo use ErrorCode_UriSyntax instead
      return this->_AnswerError(404);
    }
    else {
      // Store seriesId
      this->instanceId_ = matches[1];

      return 200;
    }
  }
  catch (const Orthanc::OrthancException& exc) {
    // Log detailed Orthanc error.
    std::string message("(CustomCommandController) Orthanc::OrthancException during URL parsing ");
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
    std::string message("(CustomCommandController) std::exception during URL parsing ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(CustomCommandController) std::string during URL parsing ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(CustomCommandController) Unknown Exception during URL parsing");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}


int CustomCommandController::_ProcessRequest()
{
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
      Json::Value noValue;
      if (this->request_->method == OrthancPluginHttpMethod_Post)
      {
          std::string url = "/tools/execute-script";
          std::string luaCode = "local instanceId = \"" + instanceId_ + "\" \n" + _config->customCommandLuaCode;
          ScopedOrthancPluginMemoryBuffer buffer(context);

          // actually, we don't check the success or not, there's nothing to do anyway !
          OrthancPluginRestApiPostAfterPlugins(context, buffer.getPtr(), url.c_str(), luaCode.c_str(), luaCode.size());
          return this->_AnswerBuffer(noValue);
      }
        else
      {
          return this->_AnswerError(405); // method not allowed
      }
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
