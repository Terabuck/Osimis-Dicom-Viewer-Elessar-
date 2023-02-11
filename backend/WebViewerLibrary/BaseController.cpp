#include "BaseController.h"

#include <json/writer.h>
#include <json/value.h>

#include "OrthancContextManager.h"

BaseController::BaseController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request)
  : response_(response), url_(url), request_(request)
{
}

OrthancPluginErrorCode BaseController::ProcessRequest() {
  // Parse the URL
  if (this->request_->groupsCount == 0) {
    // Process url (when url has no content)
    int httpStatus = this->_OnEmptyURLPostFix();
    // Stop on failure
    if (httpStatus != 200) {
      return OrthancPluginErrorCode_Success;
    }
  }
  else if (this->request_->groupsCount == 1) {
    // Process url (when url has additional content)
    int httpStatus = this->_ParseURLPostFix(this->request_->groups[0]);
    // Stop on failure
    if (httpStatus != 200) {
      return OrthancPluginErrorCode_Success;
    }
  }
  else {
    // Should not happen
    return OrthancPluginErrorCode_ParameterOutOfRange;
  }

  // Process the data
  int httpStatus = this->_ProcessRequest();
  return OrthancPluginErrorCode_Success;
}

int BaseController::_AnswerError(int errorCode) {
  OrthancPluginSendHttpStatusCode(OrthancContextManager::Get(), response_, errorCode);
  return errorCode;
}
int BaseController::_AnswerBuffer(const std::string& output, const std::string& mimeType) {
  OrthancPluginAnswerBuffer(OrthancContextManager::Get(), response_, output.c_str(), output.size(), mimeType.c_str());
  return 200;
}
int BaseController::_AnswerBuffer(const char* output, size_t outputSize, const std::string& mimeType) {
  OrthancPluginAnswerBuffer(OrthancContextManager::Get(), response_, output, outputSize, mimeType.c_str());
  return 200;
}
int BaseController::_AnswerBuffer(const Json::Value& output) {
  Json::FastWriter fastWriter;
  std::string outputStr = fastWriter.write(output);
  OrthancPluginAnswerBuffer(OrthancContextManager::Get(), response_, outputStr.c_str(), outputStr.size(), "application/json");
  return 200;
}
