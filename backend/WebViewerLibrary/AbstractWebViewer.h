#pragma once

#include <boost/noncopyable.hpp>
#include <orthanc/OrthancCPlugin.h>
#include <memory> // for std::auto_ptr

class DicomRepository;
class ImageRepository;
class SeriesRepository;
class AnnotationRepository;
class WebViewerConfiguration;
class CacheContext;
class InstanceRepository;
/**
 * The `AbstractWebViewer` class parses the config and serves both frontend and backend of the webviewer.
 * 
 * _serveFrontEnd is abstract so the frontend can be delivered separately for the wvb and the wv+,
 * as the wvb frontend library will be integrated as a bower dependency and shouldn't be delivered by
 * the wv+ backend.
 * _serveBackEnd is virtual so the wv+ can either keep/enhance or replace the wvb routes.
 */
class AbstractWebViewer : public boost::noncopyable
{
private:
  // Check orthanc version
  bool _isOrthancCompatible();

protected:
  OrthancPluginContext* _context;
  std::auto_ptr<DicomRepository> _dicomRepository;
  std::auto_ptr<ImageRepository> _imageRepository;
  std::auto_ptr<SeriesRepository> _seriesRepository;
  std::auto_ptr<InstanceRepository> _instanceRepository;
  std::auto_ptr<AnnotationRepository> _annotationRepository;
  std::auto_ptr<WebViewerConfiguration> _config;
  std::auto_ptr<CacheContext> _cache;

  /**
   * Set the configuration, used to fill the `_config` instance variable.
   * 
   * This method is virtual and can be overriden to provide inherited version of
   * the WebViewerConfiguration. It should call WebViewerConfiguration#parseFile.
   *
   * @return {std::auto_ptr<WebViewerConfiguration>} The configuration object
   */
  virtual std::auto_ptr<WebViewerConfiguration> _createConfig();

  // Serve front-end folder
  virtual void _serveFrontEnd() = 0; // abstract method so wvb frontend is not included within wv+ backend

  // Serve back-end routes
  virtual void _serveBackEnd();

public:
  AbstractWebViewer(OrthancPluginContext* context);
  virtual ~AbstractWebViewer();

  /**
   * Init the webviewer.
   * Should be called by the OrthancPluginInitialize function.
   * 
   * @return {int32_t} The error code returned to the OrthancPluginInitialize function (0 for success, -1 for error).
   */
  int32_t start();
};
