#ifndef BASE_ROUTE_H
#define BASE_ROUTE_H

#include <string>
#include <json/value.h>
#include <orthanc/OrthancCPlugin.h>
#include "OrthancContextManager.h"

// @todo boost::noncopyable
class BaseController {
public:
  BaseController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request);
  virtual ~BaseController() {}
  OrthancPluginErrorCode ProcessRequest();

protected:

  // Called when the route URL isn't postfixed
  // Returns the HTTP status (200 for success)
  virtual int _OnEmptyURLPostFix() { return 404; }

  // Parse the rest of the URL (the relative URL without the path prefix set in RegisterRoute)
  // Returns the HTTP status (200 for success)
  virtual int _ParseURLPostFix(const std::string& urlPostfix) { return 404; }

  // Process the url content
  // Returns the HTTP status (200 for success)
  virtual int _ProcessRequest() = 0;

  int _AnswerError(int errorCode);
  int _AnswerBuffer(const char* output, size_t outputSize, const std::string& mimeType);
  int _AnswerBuffer(const std::string& output, const std::string& mimeType);
  int _AnswerBuffer(const Json::Value& output);

protected:
  OrthancPluginRestOutput* response_;
  const std::string url_;
  const OrthancPluginHttpRequest* request_;
};

// Convert Route to Orthanc C Callback Format
template<typename CONTROLLER_T>
OrthancPluginErrorCode GetRouteCallback(OrthancPluginRestOutput* response, const char* url, const OrthancPluginHttpRequest* request) {
  CONTROLLER_T controller(response, url, request);

  return controller.ProcessRequest();
}

// Register route within Orthanc
template<typename CONTROLLER_T>
void RegisterRoute(const std::string& path_prefix) {
  std::string path = path_prefix + "?(.*)";

  OrthancPluginRegisterRestCallbackNoLock(OrthancContextManager::Get(), path.c_str(), GetRouteCallback<CONTROLLER_T>);
}

#endif // BASE_ROUTE_H
