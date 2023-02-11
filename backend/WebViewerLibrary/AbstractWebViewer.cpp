#include "AbstractWebViewer.h"

#include <typeinfo> // Fix gil 'bad_cast' not member of 'std' https://svn.boost.org/trac/boost/ticket/2483

#include <string>
#include <memory>
#include <boost/thread.hpp>
#include <boost/lexical_cast.hpp>
#include <boost/filesystem.hpp>

#include <orthanc/OrthancCPlugin.h>
#include <Core/OrthancException.h>
#include <Core/Toolbox.h>
#include <Core/DicomFormat/DicomMap.h>
#include <Plugins/Samples/GdcmDecoder/GdcmDecoderCache.h>

#include "ViewerToolbox.h"
#include "OrthancContextManager.h"
#include "BaseController.h"
#include "Instance/DicomRepository.h"
#include "Instance/InstanceRepository.h"
#include "Study/StudyController.h"
#include "Series/SeriesRepository.h"
#include "Series/SeriesController.h"
#include "Image/ImageRepository.h"
#include "Image/ImageController.h"
#include "Language/LanguageController.h"
#include "CustomCommand/CustomCommandController.h"
#include "Annotation/AnnotationRepository.h"
#include "Config/ConfigController.h"
#include "Config/WebViewerConfiguration.h"
#include "ShortTermCache/CacheContext.h"
#include "ShortTermCache/CacheScheduler.h"
#include "ShortTermCache/ViewerPrefetchPolicy.h"
#include "SeriesInformationAdapter.h"

namespace
{
  // Needed locally for use by orthanc's callbacks
  OrthancPluginContext* _context;
  CacheContext* _cache = NULL;
  InstanceRepository* _instanceRepository = NULL;
  const WebViewerConfiguration* _config;

  void _configureDicomDecoderPolicy();
  void _configureOnChangeCallback();

  OrthancPluginErrorCode _decodeImageCallback(OrthancPluginImage** target,
                                              const void* dicom,
                                              const uint32_t size,
                                              uint32_t frameIndex);

  OrthancPluginErrorCode _onChangeCallback(OrthancPluginChangeType changeType,
                                           OrthancPluginResourceType resourceType,
                                           const char* resourceId);

  bool _isTransferSyntaxEnabled(const void* dicom,
                                const uint32_t size);

  bool _extractTransferSyntax(std::string& transferSyntax,
                              const void* dicom,
                              const uint32_t size);

  bool _displayPerformanceWarning();
}

bool AbstractWebViewer::_isOrthancCompatible()
{
  using namespace OrthancPlugins;
  std::string message;

  /* Check the version of the Orthanc core */
  if (OrthancPluginCheckVersion(_context) == 0)
  {
    char info[1024];
    sprintf(info, "Your version of Orthanc (%s) must be above %d.%d.%d to run this plugin",
            _context->orthancVersion,
            ORTHANC_PLUGINS_MINIMAL_MAJOR_NUMBER,
            ORTHANC_PLUGINS_MINIMAL_MINOR_NUMBER,
            ORTHANC_PLUGINS_MINIMAL_REVISION_NUMBER);
    OrthancPluginLogError(_context, info);
    return false;
  }
  else {
    return true;
  }
}

std::auto_ptr<WebViewerConfiguration> AbstractWebViewer::_createConfig()
{
  // Init config (w/ default values)
  WebViewerConfiguration* config = new WebViewerConfiguration(_context);

  // Parse config
  config->parseFile(); // may throw

  return std::auto_ptr<WebViewerConfiguration>(config);
}


void AbstractWebViewer::_serveBackEnd()
{
  assert(_config.get() != NULL);

  // Inject config within ConfigController (we can't do it without static method
  // since Orthanc API doesn't allow us to pass attributes when processing REST request)
  ConfigController::setConfig(_config.get());
  CustomCommandController::setConfig(_config.get());
  SeriesController::setConfig(_config.get());

  // Register routes & controllers
  // Note: if you add some routes here, don't forget to add them in the authorization plugin
  RegisterRoute<ImageController>("/osimis-viewer/images/");
  RegisterRoute<SeriesController>("/osimis-viewer/series/");
  RegisterRoute<ConfigController>("/osimis-viewer/config.js");
  RegisterRoute<StudyController>("/osimis-viewer/studies/");
  RegisterRoute<LanguageController>("/osimis-viewer/languages/");
  RegisterRoute<CustomCommandController>("/osimis-viewer/custom-command/");
}

AbstractWebViewer::AbstractWebViewer(OrthancPluginContext* context)
{
  _context = context;
  _config = std::auto_ptr<WebViewerConfiguration>(NULL); // set in #start()

  // Share the context statically with the _decodeImageCallback and other orthanc C callbacks
  ::_context = _context;

  OrthancContextManager::Set(_context); // weird // @todo inject

  // Instantiate repositories @warning member declaration order is important
  _dicomRepository.reset(new DicomRepository);
  _imageRepository.reset(new ImageRepository(_dicomRepository.get(), _cache.get()));
  _instanceRepository.reset(new InstanceRepository(_context));
  _seriesRepository.reset(new SeriesRepository(_context, _dicomRepository.get(), _instanceRepository.get()));
  _annotationRepository.reset(new AnnotationRepository);

  // Inject repositories within controllers (we can't do it without static method
  // since Orthanc API doesn't allow us to pass attributes when processing REST request)
  StudyController::Inject(_annotationRepository.get());
  ImageController::Inject(_imageRepository.get());
  ImageController::Inject(_annotationRepository.get());
  SeriesController::Inject(_seriesRepository.get());

  ::_instanceRepository = _instanceRepository.get();
}

int32_t AbstractWebViewer::start()
{
  // Display warning if assert are activated
  assert(_displayPerformanceWarning());

  // @note we don't do the work within the constructor to ensure we can benefit from polymorphism
  OrthancPluginLogWarning(_context, "Initializing the Web viewer");

  if (!_isOrthancCompatible()) {
    // @todo use exception instead of return code
    return -1;
  }

  // Set description
  OrthancPluginSetDescription(_context, "Provides a Web viewer of DICOM series within Orthanc.");

  // Set default configuration
  try {
    _config = _createConfig();
  }
  catch(...) {
    // @todo handle error logging at that level (or even upper -> better)
    // @todo use exception instead of return code
    return -1;
  }

  // Share the config with the _decodeImageCallback and other orthanc callbacks
  ::_config = _config.get();

  if (_config->shortTermCacheEnabled) {
    _cache.reset(new CacheContext(_config->shortTermCachePath.string(),
                                  _context,
                                  _config->shortTermCacheDebugLogsEnabled,
                                  _config->shortTermCachePrefetchOnInstanceStored,
                                  _seriesRepository.get())
                 );
    ::_cache = _cache.get();

    OrthancPlugins::CacheScheduler& scheduler = _cache->GetScheduler();
    scheduler.RegisterPolicy(new OrthancPlugins::ViewerPrefetchPolicy(_context, _seriesRepository.get()));
    scheduler.Register(CacheBundle_SeriesInformation,
                       new OrthancPlugins::SeriesInformationAdapter(_context, scheduler), 1);
    /* Set the quotas */
    scheduler.SetQuota(CacheBundle_SeriesInformation, 1000, 0);    // Keep info about 1000 series

    scheduler.Register(CacheBundle_DecodedImage,
                       new ImageControllerCacheFactory(_imageRepository.get()),
                       _config->shortTermCacheDecoderThreadsCound);
    scheduler.SetQuota(CacheBundle_DecodedImage, 0, static_cast<uint64_t>(_config->shortTermCacheSize) * 1024 * 1024);

    ImageController::Inject(_cache.get());
  }

  _instanceRepository->EnableCachingInMetadata(_config->instanceInfoCacheEnabled);
  _seriesRepository->EnableCachingInMetadata(_config->instanceInfoCacheEnabled);

  if (_config->keyImageCaptureEnabled) {
    // register the OsimisNote tag
    OrthancPluginRegisterDictionaryTag(_context,
                                       0x7331,
                                       0x1000,
                                       OrthancPluginValueRepresentation_LT,
                                       "OsimisNote",
                                       1,
                                       1
                                       );
  }

  // Inject configuration within components
  _imageRepository->enableCachedImageStorage(_config->persistentCachedImageStorageEnabled);
  _annotationRepository->enableAnnotationStorage(_config->annotationStorageEnabled);

  // Configure DICOM decoder policy (GDCM/internal)
  _configureDicomDecoderPolicy();

  _configureOnChangeCallback();

  // Register routes
  _serveBackEnd();
  _serveFrontEnd();

  // Return success
  return 0;
}

AbstractWebViewer::~AbstractWebViewer()
{
  OrthancPluginLogWarning(_context, "Finalizing the Web viewer");
  ::_instanceRepository = NULL;
}

namespace
{
  void _configureOnChangeCallback()
  {
    if (::_cache !=NULL)
    {
      OrthancPluginRegisterOnChangeCallback(::_context, _onChangeCallback);
    }
  }

  OrthancPluginErrorCode _onChangeCallback(OrthancPluginChangeType changeType,
                                           OrthancPluginResourceType resourceType,
                                           const char* resourceId)
  {
    try
    {
      if (changeType == OrthancPluginChangeType_NewInstance &&
          resourceType == OrthancPluginResourceType_Instance)
      {
        ::_instanceRepository->SignalNewInstance(resourceId);
        ::_cache->SignalNewInstance(resourceId);
      }

      return OrthancPluginErrorCode_Success;
    }
    catch (std::runtime_error& e)
    {
      OrthancPluginLogError(::_context, e.what());
      return OrthancPluginErrorCode_Success;  // Ignore error
    }
    catch (...)
    {
      OrthancPluginLogError(::_context, "unexpected error in onChangeCallback");
      return OrthancPluginErrorCode_Success;  // Ignore error
    }
  }

  void _configureDicomDecoderPolicy()
  {
    // Configure the DICOM decoder
    if (_config->gdcmEnabled)
    {
      // Replace the default decoder of DICOM images that is built in Orthanc
      OrthancPluginLogWarning(::_context, "Using GDCM instead of the DICOM decoder that is built in Orthanc");
      OrthancPluginRegisterDecodeImageCallback(::_context, _decodeImageCallback);
    }
    else
    {
      OrthancPluginLogWarning(::_context, "Using the DICOM decoder that is built in Orthanc (not using GDCM)");
    }
  }

  boost::mutex gdcmDecoderMutex; // it seems that the GDCM decoder is not supporting being used from multiple threads at the same time.
    // right now (as of Orthanc 1.5.6, there's a mutex in the OrthancPlugins::DecodeUnsafe method that prevents _decodeImageCallback
    // to be called from multiple threads.  However, this mutex might be removed some day so we do add one here.

  OrthancPluginErrorCode _decodeImageCallback(OrthancPluginImage** target,
                                              const void* dicom,
                                              const uint32_t size,
                                              uint32_t frameIndex)
  {
    try
    {
      boost::mutex::scoped_lock lock(gdcmDecoderMutex);
      if (!_isTransferSyntaxEnabled(dicom, size))
      {
        *target = NULL;
        return OrthancPluginErrorCode_Success;
      }

      std::auto_ptr<OrthancPlugins::OrthancImageWrapper> image;

      OrthancPlugins::GdcmImageDecoder decoder(dicom, size);
      image.reset(new OrthancPlugins::OrthancImageWrapper(::_context, decoder.Decode(::_context, frameIndex)));

      *target = image->Release();

      return OrthancPluginErrorCode_Success;
    }
    catch (Orthanc::OrthancException& e)
    {
      *target = NULL;

      std::string s = "Cannot decode image using GDCM: " + std::string(e.What());
      OrthancPluginLogError(::_context, s.c_str());
      return OrthancPluginErrorCode_Plugin;
    }
    catch (std::runtime_error& e)
    {
      *target = NULL;

      std::string s = "Cannot decode image using GDCM: " + std::string(e.what());
      OrthancPluginLogError(::_context, s.c_str());
      return OrthancPluginErrorCode_Plugin;
    }
    catch (...)
    {
      OrthancPluginLogError(::_context, "unexpected error in decodeImageCallback");
      return OrthancPluginErrorCode_Plugin;
    }
  }

  bool _isTransferSyntaxEnabled(const void* dicom,
                                const uint32_t size)
  {
    std::string formattedSize;

    {
      char tmp[16];
      sprintf(tmp, "%0.1fMB", static_cast<float>(size) / (1024.0f * 1024.0f));
      formattedSize.assign(tmp);
    }

    if (!_config->restrictTransferSyntaxes)
    {
      std::string s = "Decoding one DICOM instance of " + formattedSize + " using GDCM";
      OrthancPluginLogInfo(::_context, s.c_str());
      return true;
    }

    std::string transferSyntax;
    if (!_extractTransferSyntax(transferSyntax, dicom, size))
    {
      std::string s = ("Cannot extract the transfer syntax of this instance of " +
                       formattedSize + ", will use GDCM to decode it");
      OrthancPluginLogInfo(::_context, s.c_str());
      return true;
    }

    if (_config->enabledTransferSyntaxes.find(transferSyntax) != _config->enabledTransferSyntaxes.end())
    {
      // Decoding for this transfer syntax is enabled
      std::string s = ("Using GDCM to decode this instance of " +
                       formattedSize + " with transfer syntax " + transferSyntax);
      OrthancPluginLogInfo(::_context, s.c_str());
      return true;
    }
    else
    {
      std::string s = ("Won't use GDCM to decode this instance of " +
                       formattedSize + ", as its transfer syntax " + transferSyntax + " is disabled");
      OrthancPluginLogInfo(::_context, s.c_str());
      return false;
    }
  }

  bool _extractTransferSyntax(std::string& transferSyntax,
                              const void* dicom,
                              const uint32_t size)
  {
    Orthanc::DicomMap header;
    if (!Orthanc::DicomMap::ParseDicomMetaInformation(header, reinterpret_cast<const char*>(dicom), size))
    {
      return false;
    }

    const Orthanc::DicomValue* tag = header.TestAndGetValue(0x0002, 0x0010);
    if (tag == NULL ||
        tag->IsNull() ||
        tag->IsBinary())
    {
      return false;
    }
    else
    {
      // Stripping spaces should not be required, as this is a UI value
      // representation whose stripping is supported by the Orthanc
      // core, but let's be careful...
      transferSyntax = Orthanc::Toolbox::StripSpaces(tag->GetContent());
      return true;
    }
  }

  bool _displayPerformanceWarning()
  {
    (void) _displayPerformanceWarning;   // Disable warning about unused function
    OrthancPluginLogWarning(_context, "Performance warning in Web viewer: "
                                      "Non-release build, runtime debug assertions are turned on");
    return true;
  }

}
