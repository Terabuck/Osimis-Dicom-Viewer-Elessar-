#include "WebViewer.h"

#include <orthanc/OrthancCPlugin.h>
#include <Core/OrthancException.h>
#include <Core/Toolbox.h>

#include <ViewerToolbox.h>
#include <EmbeddedResources.h>
#include "Version.h"
#include "Language/LanguageController.h"

namespace {
  // Needed locally for use by orthanc's callbacks
  OrthancPluginContext* _context;

#if ORTHANC_STANDALONE == 0
  static OrthancPluginErrorCode _serveWebViewer(OrthancPluginRestOutput* output,
                                          const char* url,
                                          const OrthancPluginHttpRequest* request);
#else
  template <enum Orthanc::EmbeddedResources::DirectoryResourceId folder>
  static OrthancPluginErrorCode _serveEmbeddedFolder(OrthancPluginRestOutput* output,
                                               const char* url,
                                               const OrthancPluginHttpRequest* request);
#endif
}

WebViewer::WebViewer(OrthancPluginContext* context) : AbstractWebViewer(context)
{
  ::_context = context;
}

void WebViewer::_serveFrontEnd()
{
  // Serve web viewer front end
#if ORTHANC_STANDALONE == 0
  OrthancPluginRegisterRestCallbackNoLock(_context, "/osimis-viewer/app/(.*)", _serveWebViewer); // @todo use common interface with RegisterRoute
#else
  OrthancPluginRegisterRestCallbackNoLock(_context, "/osimis-viewer/app/(.*)", _serveEmbeddedFolder<Orthanc::EmbeddedResources::WEB_VIEWER>); // @todo use common interface with RegisterRoute
#endif

  // Integrate web viewer front end within Orthanc front end
  std::string explorer;
  Orthanc::EmbeddedResources::GetFileResource(explorer, Orthanc::EmbeddedResources::ORTHANC_EXPLORER);
  OrthancPluginExtendOrthancExplorer(_context, explorer.c_str());

  // configure languages
  LanguageController::addLanguageFile("en", "/osimis-viewer/app/languages/en.json");
  LanguageController::addLanguageFile("fr", "/osimis-viewer/app/languages/fr.json");
  LanguageController::addLanguageFile("nl", "/osimis-viewer/app/languages/nl.json");
  LanguageController::addLanguageFile("es", "/osimis-viewer/app/languages/es.json");
  LanguageController::addLanguageFile("pt", "/osimis-viewer/app/languages/pt.json");
  LanguageController::addLanguageFile("it", "/osimis-viewer/app/languages/it.json");
  LanguageController::addLanguageFile("jp", "/osimis-viewer/app/languages/jp.json");
  LanguageController::addLanguageFile("gr", "/osimis-viewer/app/languages/gr.json");
  LanguageController::addLanguageFile("zh", "/osimis-viewer/app/languages/zh.json");
}

const std::string& WebViewer::getName()
{
  static std::string name = "osimis-web-viewer"; // store in static var to make sure .c_str() call doesn't provide dead pointer
  return name;
}

const std::string& WebViewer::getVersion()
{
  static std::string version = PRODUCT_VERSION_FULL_STRING; // store in static var to make sure .c_str() call doesn't provide dead pointer
  return version;
}

namespace {
#if ORTHANC_STANDALONE == 0
  OrthancPluginErrorCode _serveWebViewer(OrthancPluginRestOutput* output,
                                          const char* url,
                                          const OrthancPluginHttpRequest* request)
  {
    if (request->method != OrthancPluginHttpMethod_Get)
    {
      OrthancPluginSendMethodNotAllowed(::_context, output, "GET");
      return OrthancPluginErrorCode_Success;
    }

    const std::string path = std::string(WEB_VIEWER_PATH) + std::string(request->groups[0]);
    const char* mime = OrthancPlugins::GetMimeType(path);

    std::string s;
    try
    {
      Orthanc::Toolbox::ReadFile(s, path);
      const char* resource = s.size() ? s.c_str() : NULL;
      OrthancPluginAnswerBuffer(::_context, output, resource, s.size(), mime);
    }
    catch (Orthanc::OrthancException&)
    {
      std::string s = "Inexistent file in served folder: " + path;
      OrthancPluginLogError(::_context, s.c_str());
      OrthancPluginSendHttpStatusCode(::_context, output, 404);
    }

    return OrthancPluginErrorCode_Success;
  }
#else
  template <enum Orthanc::EmbeddedResources::DirectoryResourceId folder>
  static OrthancPluginErrorCode _serveEmbeddedFolder(OrthancPluginRestOutput* output,
                                               const char* url,
                                               const OrthancPluginHttpRequest* request)
  {
    if (request->method != OrthancPluginHttpMethod_Get)
    {
      OrthancPluginSendMethodNotAllowed(::_context, output, "GET");
      return OrthancPluginErrorCode_Success;
    }

    std::string path = "/" + std::string(request->groups[0]);
    const char* mime = OrthancPlugins::GetMimeType(path);

    try
    {
      std::string s;
      Orthanc::EmbeddedResources::GetDirectoryResource(s, folder, path.c_str());

      const char* resource = s.size() ? s.c_str() : NULL;
      OrthancPluginAnswerBuffer(::_context, output, resource, s.size(), mime);

      return OrthancPluginErrorCode_Success;
    }
    catch (...)
    {
      std::string s = "Unknown static resource in plugin: " + std::string(request->groups[0]);
      OrthancPluginLogError(::_context, s.c_str());
      OrthancPluginSendHttpStatusCode(::_context, output, 404);
      return OrthancPluginErrorCode_Success;
    }
  }
#endif
}
