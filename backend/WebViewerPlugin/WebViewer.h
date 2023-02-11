#pragma once

#include <string>
#include <boost/noncopyable.hpp>
#include <orthanc/OrthancCPlugin.h>
#include <AbstractWebViewer.h>

/**
 * The `WebViewer` class parses the config and serves both frontend and backend of the webviewer.
 */
class WebViewer : public AbstractWebViewer {
protected:
  // Serve front-end folder
  virtual void _serveFrontEnd();

public:
  WebViewer(OrthancPluginContext* context);

  static const std::string& getName();
  static const std::string& getVersion();
};
