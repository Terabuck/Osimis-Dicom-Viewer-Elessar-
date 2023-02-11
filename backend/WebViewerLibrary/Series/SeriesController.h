#pragma once

#include <string>

#include "../BaseController.h"
#include "SeriesRepository.h"

// .../<series_id>

class WebViewerConfiguration;

class SeriesController : public BaseController, public boost::noncopyable {
private:
  /**
   * The webviewer configuration.
   *
   * @rationale
   * We can't do it without static since Orthanc API doesn't allow us to pass
   * attributes when processing REST request.
   */
  static const WebViewerConfiguration* _config;

public:
  SeriesController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request);

  template<typename T>
  static void Inject(T* obj);

protected:
  virtual int _ParseURLPostFix(const std::string& urlPostfix);
  virtual int _ProcessRequest();

private:
  static SeriesRepository* seriesRepository_;

  std::string seriesId_;

public:
  static void setConfig(const WebViewerConfiguration* config) {_config = config; }
};
