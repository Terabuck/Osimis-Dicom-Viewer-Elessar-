#include "ConfigController.h"

#include <assert.h>
#include <string>
#include <Core/OrthancException.h>
#include <boost/lexical_cast.hpp> // to retrieve exception error code for log

#include "../OrthancContextManager.h"
#include "WebViewerConfiguration.h"

const WebViewerConfiguration* ConfigController::_config = NULL;

ConfigController::ConfigController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request)
  : BaseController(response, url, request)
{

}

void ConfigController::setConfig(const WebViewerConfiguration* config) {
  _config = config;
}

int ConfigController::_ParseURLPostFix(const std::string& urlPostfix) {
    // There is no additional parameter to parse, so we can just return success
    return 200;
}

int ConfigController::_ProcessRequest()
{
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
    assert(_config != NULL);

    // Write Log
    std::string message = "Retrieving configuration from frontend";
    OrthancPluginLogInfo(context, message.c_str());

    // Retrieve the frontend related config
    std::string frontendConfig = "var __webViewerConfig = " + _config->getFrontendConfig().toStyledString() + ";";

    // Answer Request with frontend config as JSON
    return this->_AnswerBuffer(frontendConfig, "application/javascript");
  }
  // @note if the exception has been thrown from some constructor,
  // memory leaks may happen. we should fix the bug instead of focusing on those memory leaks.
  // however, in case of memory leak due to bad alloc, we should clean memory.
  // @todo avoid memory allocation within constructor
  catch (const Orthanc::OrthancException& exc) {
    // Log detailed Orthanc error.
    std::string message("(ConfigController) Orthanc::OrthancException ");
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
    std::string message("(ConfigController) std::exception ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(ConfigController) std::string ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(ConfigController) Unknown Exception");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}
