#pragma once

/**
 * The `ConfigController` controller share the frontend configuration publicly.
 *
 * The config is shared via the route `/osimis-viewer/config.js`. It's served as a JS
 * file because it's easier to handle synchronous JS configuration than JSON one.
 */

#include "../BaseController.h"

class WebViewerConfiguration;

class ConfigController : public BaseController {
private:
  /**
   * The webviewer configuration.
   * 
   * @rationale
   * We can't do it without static since Orthanc API doesn't allow us to pass
   * attributes when processing REST request.
   */
  static const WebViewerConfiguration* _config;

protected:
  virtual int _ParseURLPostFix(const std::string& urlPostfix);
  virtual int _ProcessRequest();

public:
  ConfigController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request);

  /**
   * Inject the webviewer configuration object used to parse frontend options.
   *
   * @rationale
   * - See `_config` comments.
   * - WebViewerConfiguration instance must not be copied at this level since it can
   * be inherited.
   * 
   * @param config 
   */
  static void setConfig(const WebViewerConfiguration* config); // does NOT take ownership
};
