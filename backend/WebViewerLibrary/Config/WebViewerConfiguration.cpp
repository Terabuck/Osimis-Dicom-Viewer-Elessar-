#include "WebViewerConfiguration.h"

#include <orthanc/OrthancCPlugin.h>
#include <json/json.h>
#include <Core/OrthancException.h>
#include <boost/thread.hpp>
#include <algorithm>
#include <Plugins/Samples/Common/OrthancPluginCppWrapper.h>

#include "ViewerToolbox.h"


WebViewerConfiguration::WebViewerConfiguration(OrthancPluginContext* context)
  : _context(context)
{
}


void WebViewerConfiguration::_parseFile(const Json::Value& wvConfig)
{
  // By default, set these windowing presets. note, these are the default values sent to the frontend -> they are in mixedCase (in the settings, they are in CamelCase)
  windowingPresets = Json::Value(Json::arrayValue);
  windowingPresets.append(Json::Value(Json::arrayValue));
  windowingPresets[0] = Json::Value(Json::objectValue);
  windowingPresets[0]["name"] = "Ct Lung";
  windowingPresets[0]["windowCenter"] = -400;
  windowingPresets[0]["windowWidth"] = 1600;
  windowingPresets[1] = Json::Value(Json::objectValue);
  windowingPresets[1]["name"] = "Ct Abdomen";
  windowingPresets[1]["windowCenter"] = 60;
  windowingPresets[1]["windowWidth"] = 400;
  windowingPresets[2] = Json::Value(Json::objectValue);
  windowingPresets[2]["name"] = "Ct Bone";
  windowingPresets[2]["windowCenter"] = 300;
  windowingPresets[2]["windowWidth"] = 1500;
  windowingPresets[3] = Json::Value(Json::objectValue);
  windowingPresets[3]["name"] = "Ct Brain";
  windowingPresets[3]["windowCenter"] = 40;
  windowingPresets[3]["windowWidth"] = 80;
  windowingPresets[4] = Json::Value(Json::objectValue);
  windowingPresets[4]["name"] = "Ct Chest";
  windowingPresets[4]["windowCenter"] = 40;
  windowingPresets[4]["windowWidth"] = 400;
  windowingPresets[5] = Json::Value(Json::objectValue);
  windowingPresets[5]["name"] = "Ct Angio";
  windowingPresets[5]["windowCenter"] = 300;
  windowingPresets[5]["windowWidth"] = 600;

  windowingBehaviour = Json::Value(Json::objectValue);
  windowingBehaviour["left"] = "decrease-ww";
  windowingBehaviour["right"] = "increase-ww";
  windowingBehaviour["up"] = "decrease-wc";
  windowingBehaviour["down"] = "increase-wc";

  combinedToolBehaviour = Json::Value(Json::objectValue);
  combinedToolBehaviour["leftMouseButton"] = "windowing";
  combinedToolBehaviour["middleMouseButton"] = "pan";
  combinedToolBehaviour["rightMouseButton"] = "zoom";
  combinedToolBehaviour["oneTouchPan"] = "windowing";
  combinedToolBehaviour["twoTouchPan"] = "pan";
  combinedToolBehaviour["threeTouchPan"] = Json::nullValue;

  mouseWheelBehaviour["down"] = "nextImage";
  mouseWheelBehaviour["up"] = "previousImage";

  keyboardShortcuts = Json::Value(Json::objectValue);
  keyboardShortcuts["left"] = "previousImage";
  keyboardShortcuts["right"] = "nextImage";
  keyboardShortcuts["up"] = "previousSeries";
  keyboardShortcuts["down"] = "nextSeries";
  keyboardShortcuts["shift + up"] = "previousStudy";
  keyboardShortcuts["shift + down"] = "nextStudy";

  keyboardShortcuts["l"] = "rotateLeft";
  keyboardShortcuts["r"] = "rotateRight";
  keyboardShortcuts["v"] = "flipVertical";
  keyboardShortcuts["h"] = "flipHorizontal";
  keyboardShortcuts["i"] = "invertColor";
  keyboardShortcuts["c"] = "selectCombinedTool";
  keyboardShortcuts["p"] = "selectPanTool";
  keyboardShortcuts["z"] = "selectZoomTool";
  keyboardShortcuts["w"] = "selectWindowingTool";
  keyboardShortcuts["ctrl + l, command + l"] = "selectLengthMeasureTool";
  keyboardShortcuts["ctrl + i, command + i"] = "selectPixelProbeTool";
  keyboardShortcuts["ctrl + m, command + m"] = "selectMagnifyingGlassTool";
  keyboardShortcuts["ctrl + e, command + e"] = "selectEllipticalRoiTool";
  keyboardShortcuts["ctrl + o, command + o"] = "selectRectangleRoiTool";
  keyboardShortcuts["ctrl + a, command + a"] = "selectArrowAnnotateTool";
  keyboardShortcuts["ctrl + k, command + k"] = "selectKeyImageCaptureTool";
  keyboardShortcuts["ctrl + p, command + p"] = "print";
  keyboardShortcuts["1, num1"] = "applyEmbeddedWindowingPreset1";
  keyboardShortcuts["2, num2"] = "applyEmbeddedWindowingPreset2";
  keyboardShortcuts["3, num3"] = "applyEmbeddedWindowingPreset3";
  keyboardShortcuts["4, num4"] = "applyEmbeddedWindowingPreset4";
  keyboardShortcuts["5, num5"] = "applyEmbeddedWindowingPreset5";
  keyboardShortcuts["ctrl + 1, ctrl + num1, command + 1, command + num1"] = "applyConfigWindowingPreset1";
  keyboardShortcuts["ctrl + 2, ctrl + num2, command + 2, command + num2"] = "applyConfigWindowingPreset2";
  keyboardShortcuts["ctrl + 3, ctrl + num3, command + 3, command + num3"] = "applyConfigWindowingPreset3";
  keyboardShortcuts["ctrl + 4, ctrl + num4, command + 4, command + num4"] = "applyConfigWindowingPreset4";
  keyboardShortcuts["ctrl + 5, ctrl + num5, command + 5, command + num5"] = "applyConfigWindowingPreset5";
  keyboardShortcuts["s"] = "toggleSynchro";
  keyboardShortcuts["f1"] = "setLayout1x1";
  keyboardShortcuts["f2"] = "setLayout1x2";
  keyboardShortcuts["f3"] = "setLayout2x1";
  keyboardShortcuts["f4"] = "setLayout2x2";
  keyboardShortcuts["space"] = "playPause";
  keyboardShortcuts["tab"] = "selectNextPane";
  keyboardShortcuts["shift + tab"] = "selectPreviousPane";
  keyboardShortcuts["enter"] = "loadSeriesInPane";

  instanceInfoCacheEnabled = OrthancPlugins::GetBoolValue(wvConfig, "InstanceInfoCacheEnabled", false);

  bool hasGdcmPlugin = OrthancPlugins::CheckMinimalOrthancVersion(1, 7, 0);
  gdcmEnabled = OrthancPlugins::GetBoolValue(wvConfig, "GdcmEnabled", !hasGdcmPlugin); // now that the GDCM plugin is available (Orthanc 1.7.0)
  // By default, use GDCM for everything.
  restrictTransferSyntaxes = false;

  // Restrict GDCM usage to the specified transfer syntaxes
  if (gdcmEnabled)
  {
    static const char* CONFIG_RESTRICT_TRANSFER_SYNTAXES = "RestrictTransferSyntaxes";
    if (wvConfig.isMember(CONFIG_RESTRICT_TRANSFER_SYNTAXES))
    {
      const Json::Value& config = wvConfig[CONFIG_RESTRICT_TRANSFER_SYNTAXES];

      if (config.type() != Json::arrayValue)
      {
        throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
      }

      restrictTransferSyntaxes = true;
      for (Json::Value::ArrayIndex i = 0; i < config.size(); i++)
      {
        if (config[i].type() != Json::stringValue)
        {
          throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
        }
        else
        {
          std::string s = "Web viewer will use GDCM to decode transfer syntax " + config[i].asString();
          enabledTransferSyntaxes.insert(config[i].asString());
          OrthancPluginLogWarning(_context, s.c_str());
        }
      }
    }
    else
    {
      // by default, use GDCM only for JPEG 2000
      restrictTransferSyntaxes = true;

      enabledTransferSyntaxes.insert("1.2.840.10008.1.2.4.90");   // JPEG 2000 Image Compression (Lossless Only)
      enabledTransferSyntaxes.insert("1.2.840.10008.1.2.4.91");   // JPEG 2000 Image Compression
      enabledTransferSyntaxes.insert("1.2.840.10008.1.2.4.92");   // JPEG 2000 Part 2 Multicomponent Image Compression (Lossless Only)
      enabledTransferSyntaxes.insert("1.2.840.10008.1.2.4.93");   // JPEG 2000 Part 2 Multicomponent Image Compression
    }
  }

  if (wvConfig.isMember("SeriesToIgnore"))
  {
    seriesToIgnore = wvConfig["SeriesToIgnore"];
  }
  if (wvConfig.isMember("SeriesToIgnoreFromMetadata"))
  {
    seriesToIgnoreFromMetadata = wvConfig["SeriesToIgnoreFromMetadata"];
  }

  // Retrieve windowing preset (if set).
  if (wvConfig.isMember("WindowingPresets") &&
      wvConfig["WindowingPresets"].type() == Json::arrayValue)
  {
    windowingPresets = Json::Value(Json::arrayValue);  // remove default values

    for (Json::Value::ArrayIndex i = 0; i < wvConfig["WindowingPresets"].size(); i++)
    {
      Json::Value preset = wvConfig["WindowingPresets"][i];
      if (preset.type() != Json::objectValue) {
        OrthancPluginLogError(_context, "WindowingPresets invalid value.  It shall be an object.");
        throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
      }
      else
      {
        windowingPresets[i] = Json::Value(Json::objectValue);
        windowingPresets[i]["name"] = preset["Name"];
        windowingPresets[i]["windowCenter"] = preset["WindowCenter"];
        windowingPresets[i]["windowWidth"] = preset["WindowWidth"];
      }
    }
  }

  // Retrieve combinedTool preset (if set).
  if (wvConfig.isMember("CombinedToolBehaviour") &&
      wvConfig["CombinedToolBehaviour"].type() == Json::objectValue)
  {
    combinedToolBehaviour = Json::Value(Json::objectValue);  // remove default values

    Json::Value::Members members = wvConfig["CombinedToolBehaviour"].getMemberNames();

    for (size_t i = 0; i < members.size(); i++) {
      combinedToolBehaviour[members[i].c_str()] = wvConfig["CombinedToolBehaviour"][members[i]];
    }
  }

  // Retrieve windowing (if set).
  if (wvConfig.isMember("WindowingBehaviour") &&
      wvConfig["WindowingBehaviour"].type() == Json::objectValue)
  {
    windowingBehaviour = Json::Value(Json::objectValue);  // remove default values

    Json::Value::Members members = wvConfig["WindowingBehaviour"].getMemberNames();

    for (size_t i = 0; i < members.size(); i++)
    {
      windowingBehaviour[members[i].c_str()] = wvConfig["WindowingBehaviour"][members[i]];
    }
  }

  // Retrieve mouse wheel (if set).
  if (wvConfig.isMember("MouseWheelBehaviour") &&
      wvConfig["MouseWheelBehaviour"].type() == Json::objectValue)
  {
    mouseWheelBehaviour = Json::Value(Json::objectValue);  // remove default values

    Json::Value::Members members = wvConfig["MouseWheelBehaviour"].getMemberNames();

    for (size_t i = 0; i < members.size(); i++)
    {
      mouseWheelBehaviour[members[i].c_str()] = wvConfig["MouseWheelBehaviour"][members[i]];
    }
  }

  // Retrieve keyboardShortcuts (if set).
  if (wvConfig.isMember("KeyboardShortcuts") &&
      wvConfig["KeyboardShortcuts"].type() == Json::objectValue)
  {
    keyboardShortcuts = Json::Value(Json::objectValue);  // remove default values

    Json::Value::Members members = wvConfig["KeyboardShortcuts"].getMemberNames();

    for (size_t i = 0; i < members.size(); i++)
    {
      keyboardShortcuts[members[i].c_str()] = wvConfig["KeyboardShortcuts"][members[i]];
    }
  }

  persistentCachedImageStorageEnabled = OrthancPlugins::GetBoolValue(wvConfig, "CacheEnabled", false);
  studyDownloadEnabled = OrthancPlugins::GetBoolValue(wvConfig, "StudyDownloadEnabled", true);
  keyboardShortcutsEnabled = OrthancPlugins::GetBoolValue(wvConfig, "KeyboardShortcutsEnabled", true);
  videoDisplayEnabled = OrthancPlugins::GetBoolValue(wvConfig, "VideoDisplayEnabled", true);
  annotationStorageEnabled = OrthancPlugins::GetBoolValue(wvConfig, "AnnotationStorageEnabled", false);
  keyImageCaptureEnabled = OrthancPlugins::GetBoolValue(wvConfig, "KeyImageCaptureEnabled", false);
  downloadAsJpegEnabled = OrthancPlugins::GetBoolValue(wvConfig, "DownloadAsJpegEnabled", false);
  combinedToolEnabled = OrthancPlugins::GetBoolValue(wvConfig, "CombinedToolEnabled", false);
  printEnabled = OrthancPlugins::GetBoolValue(wvConfig, "PrintEnabled", true);
  openAllPatientStudies = OrthancPlugins::GetBoolValue(wvConfig, "OpenAllPatientStudies", true);
  showStudyInformationBreadcrumb = OrthancPlugins::GetBoolValue(wvConfig, "ShowStudyInformationBreadcrumb", false);
  shortTermCachePrefetchOnInstanceStored = OrthancPlugins::GetBoolValue(wvConfig, "ShortTermCachePrefetchOnInstanceStored", false);
  shortTermCacheEnabled = OrthancPlugins::GetBoolValue(wvConfig, "ShortTermCacheEnabled", false);
  shortTermCacheDebugLogsEnabled = OrthancPlugins::GetBoolValue(wvConfig, "ShortTermCacheDebugLogsEnabled", false);
  shortTermCachePath = OrthancPlugins::GetStringValue(wvConfig, "ShortTermCachePath", shortTermCachePath.string());
  shortTermCacheSize = OrthancPlugins::GetIntegerValue(wvConfig, "ShortTermCacheSize", 1000);
  shortTermCacheDecoderThreadsCound = OrthancPlugins::GetIntegerValue(wvConfig, "Threads", std::max(boost::thread::hardware_concurrency() / 2, 1u));
  highQualityImagePreloadingEnabled = OrthancPlugins::GetBoolValue(wvConfig, "HighQualityImagePreloadingEnabled", true);
  reduceTimelineHeightOnSingleFrameSeries = OrthancPlugins::GetBoolValue(wvConfig, "ReduceTimelineHeightOnSingleFrameSeries", false);
  showNoReportIconInSeriesList = OrthancPlugins::GetBoolValue(wvConfig, "ShowNoReportIconInSeriesList", false);
  toolbarLayoutMode = OrthancPlugins::GetStringValue(wvConfig, "ToolbarLayoutMode", "flat");
  toolbarButtonSize = OrthancPlugins::GetStringValue(wvConfig, "ToolbarButtonSize", "small");
  defaultSelectedTool = OrthancPlugins::GetStringValue(wvConfig, "DefaultSelectedTool", "windowing");
  defaultStudyIslandsDisplayMode = OrthancPlugins::GetStringValue(wvConfig, "DefaultStudyIslandsDisplayMode", "grid");
  defaultLanguage = OrthancPlugins::GetStringValue(wvConfig, "DefaultLanguage", "en");
  customOverlayProviderUrl = OrthancPlugins::GetStringValue(wvConfig, "CustomOverlayProviderUrl", "");  // must be provided as a url relative to orthanc root url (i.e.: "/../customOverlays/")
  synchronizedBrowsingEnabled = OrthancPlugins::GetBoolValue(wvConfig, "SynchronizedBrowsingEnabled", true);
  referenceLinesEnabled = OrthancPlugins::GetBoolValue(wvConfig, "ReferenceLinesEnabled", true);
  crossHairEnabled = OrthancPlugins::GetBoolValue(wvConfig, "CrossHairEnabled", true);
  toggleOverlayTextButtonEnabled = OrthancPlugins::GetBoolValue(wvConfig, "ToggleOverlayTextButtonEnabled", false);
  toggleOverlayIconsButtonEnabled = OrthancPlugins::GetBoolValue(wvConfig, "ToggleOverlayIconsButtonEnabled", false);
  displayOverlayText = OrthancPlugins::GetBoolValue(wvConfig, "DisplayOverlayText", true);
  displayOverlayIcons = OrthancPlugins::GetBoolValue(wvConfig, "DisplayOverlayIcons", true);
  customCommandEnabled = OrthancPlugins::GetBoolValue(wvConfig, "CustomCommandEnabled", false);
  customCommandLuaCode = OrthancPlugins::GetStringValue(wvConfig, "CustomCommandLuaCode", std::string());
  customCommandIconClass = OrthancPlugins::GetStringValue(wvConfig, "CustomCommandIconClass", "fa fa-external-link-square-alt");
  customCommandIconLabel = OrthancPlugins::GetStringValue(wvConfig, "CustomCommandIconLabel", "custom action");
  dateFormat = OrthancPlugins::GetStringValue(wvConfig, "DateFormat", std::string("YYYYMMDD"));
  documentationUrl = OrthancPlugins::GetStringValue(wvConfig, "DocumentationUrl", "images/Osimis Web Viewer Documentation.pdf");
  showInfoPopupAtStartup = OrthancPlugins::GetStringValue(wvConfig, "ShowInfoPopupAtStartup", "user");
  showInfoPopupButtonEnabled = OrthancPlugins::GetBoolValue(wvConfig, "ShowInfoPopupButtonEnabled", true);
  alwaysShowNotForDiagnosticUsageDisclaimer = OrthancPlugins::GetBoolValue(wvConfig, "AlwaysShowNotForDiagnosticUsageDisclaimer", false);

  if (showStudyInformationBreadcrumb)
  {
    OrthancPluginLogWarning(_context, "The study breadcrumb has been disabled in 1.3.1 to avoid wrong patient/study identification when displaying multiple patient/studies in the same viewer");
  }

  if (toolbarLayoutMode != "flat" && toolbarLayoutMode != "tree")
  {
    OrthancPluginLogError(_context, "ToolbarLayoutMode invalid value.  Allowed values are \"flat\" and \"tree\"");
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
  }

  if (toolbarButtonSize != "small" && toolbarButtonSize != "large")
  {
    OrthancPluginLogError(_context, "ToolbarButtonSize invalid value.  Allowed values are \"small\" and \"large\"");
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
  }

  if (defaultStudyIslandsDisplayMode != "grid" && defaultStudyIslandsDisplayMode != "list" && defaultStudyIslandsDisplayMode != "oneCol")
  {
    OrthancPluginLogError(_context, "DefaultStudyIslandsDisplayMode invalid value.  Allowed values are \"grid\" and \"list\" and \"oneCol\"");
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
  }

  {// validate combinedToolBehaviour
    std::set<std::string> combinedToolAllowedToolNames;
    combinedToolAllowedToolNames.insert("windowing");
    combinedToolAllowedToolNames.insert("pan");
    combinedToolAllowedToolNames.insert("zoom");

    std::set<std::string> combinedToolAllowedActions;
    combinedToolAllowedActions.insert("leftMouseButton");
    combinedToolAllowedActions.insert("middleMouseButton");
    combinedToolAllowedActions.insert("rightMouseButton");
    combinedToolAllowedActions.insert("oneTouchPan");
    combinedToolAllowedActions.insert("twoTouchPan");
    combinedToolAllowedActions.insert("threeTouchPan");

    Json::Value::Members members = combinedToolBehaviour.getMemberNames();

    for (size_t i = 0; i < members.size(); i++)
    {
      std::string action = members[i];

      if (combinedToolAllowedActions.find(action) == combinedToolAllowedActions.end()) {
        OrthancPluginLogError(_context, (std::string("CombinedToolBehaviour invalid action: ") + action).c_str());
        throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
      }

      if (!combinedToolBehaviour[action].isNull()) {
        std::string toolName = combinedToolBehaviour[action].asString();
        if (combinedToolAllowedToolNames.find(toolName) == combinedToolAllowedToolNames.end()) {
          OrthancPluginLogError(_context, (std::string("CombinedToolBehaviour invalid toolName: ") + toolName).c_str());
          throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
        }
      }
    }
  }

  {// validate windowingBehaviour
    std::set<std::string> windowingAllowedDirections;
    windowingAllowedDirections.insert("left");
    windowingAllowedDirections.insert("right");
    windowingAllowedDirections.insert("up");
    windowingAllowedDirections.insert("down");

    std::set<std::string> windowingAllowedToolNames;
    windowingAllowedToolNames.insert("decrease-ww");
    windowingAllowedToolNames.insert("increase-ww");
    windowingAllowedToolNames.insert("decrease-wc");
    windowingAllowedToolNames.insert("increase-wc");

    Json::Value::Members members = windowingBehaviour.getMemberNames();

    for (size_t i = 0; i < members.size(); i++)
    {
      std::string direction = members[i];

      if (windowingAllowedDirections.find(direction) == windowingAllowedDirections.end()) {
        OrthancPluginLogError(_context, (std::string("WindowingBehaviour invalid direction: ") + direction).c_str());
        throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
      }

      if (!windowingBehaviour[direction].isNull()) {
        std::string toolName = windowingBehaviour[direction].asString();
        if (windowingAllowedToolNames.find(toolName) == windowingAllowedToolNames.end()) {
          OrthancPluginLogError(_context, (std::string("WindowingBehaviour invalid toolName: ") + toolName).c_str());
          throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
        }
      }
    }
  }

  {// validate keyboard shortcuts
    std::set<std::string> keyboardShortcutsAllowedToolNames;
    keyboardShortcutsAllowedToolNames.insert("nextStudy");
    keyboardShortcutsAllowedToolNames.insert("previousStudy");
    keyboardShortcutsAllowedToolNames.insert("nextSeries");
    keyboardShortcutsAllowedToolNames.insert("previousSeries");
    keyboardShortcutsAllowedToolNames.insert("nextImage");
    keyboardShortcutsAllowedToolNames.insert("previousImage");
    keyboardShortcutsAllowedToolNames.insert("rotateLeft");
    keyboardShortcutsAllowedToolNames.insert("rotateRight");
    keyboardShortcutsAllowedToolNames.insert("flipVertical");
    keyboardShortcutsAllowedToolNames.insert("flipHorizontal");
    keyboardShortcutsAllowedToolNames.insert("invertColor");
    keyboardShortcutsAllowedToolNames.insert("selectCrossHairTool");
    keyboardShortcutsAllowedToolNames.insert("selectCombinedTool");
    keyboardShortcutsAllowedToolNames.insert("selectPanTool");
    keyboardShortcutsAllowedToolNames.insert("selectWindowingTool");
    keyboardShortcutsAllowedToolNames.insert("selectZoomTool");
    keyboardShortcutsAllowedToolNames.insert("selectMagnifyingGlassTool");
    keyboardShortcutsAllowedToolNames.insert("selectLengthMeasureTool");
    keyboardShortcutsAllowedToolNames.insert("selectPixelProbeTool");
    keyboardShortcutsAllowedToolNames.insert("selectEllipticalRoiTool");
    keyboardShortcutsAllowedToolNames.insert("selectRectangleRoiTool");
    keyboardShortcutsAllowedToolNames.insert("selectArrowAnnotateTool");
    keyboardShortcutsAllowedToolNames.insert("selectKeyImageCaptureTool");
    keyboardShortcutsAllowedToolNames.insert("applyEmbeddedWindowingPreset1");
    keyboardShortcutsAllowedToolNames.insert("applyEmbeddedWindowingPreset2");
    keyboardShortcutsAllowedToolNames.insert("applyEmbeddedWindowingPreset3");
    keyboardShortcutsAllowedToolNames.insert("applyEmbeddedWindowingPreset4");
    keyboardShortcutsAllowedToolNames.insert("applyEmbeddedWindowingPreset5");
    keyboardShortcutsAllowedToolNames.insert("applyConfigWindowingPreset1");
    keyboardShortcutsAllowedToolNames.insert("applyConfigWindowingPreset2");
    keyboardShortcutsAllowedToolNames.insert("applyConfigWindowingPreset3");
    keyboardShortcutsAllowedToolNames.insert("applyConfigWindowingPreset4");
    keyboardShortcutsAllowedToolNames.insert("applyConfigWindowingPreset5");
    keyboardShortcutsAllowedToolNames.insert("toggleSynchro");
    keyboardShortcutsAllowedToolNames.insert("enableSynchro");
    keyboardShortcutsAllowedToolNames.insert("disableSynchro");
    keyboardShortcutsAllowedToolNames.insert("setLayout1x1");
    keyboardShortcutsAllowedToolNames.insert("setLayout1x2");
    keyboardShortcutsAllowedToolNames.insert("setLayout2x1");
    keyboardShortcutsAllowedToolNames.insert("setLayout2x2");
    keyboardShortcutsAllowedToolNames.insert("play");
    keyboardShortcutsAllowedToolNames.insert("pause");
    keyboardShortcutsAllowedToolNames.insert("playPause");
    keyboardShortcutsAllowedToolNames.insert("selectNextPane");
    keyboardShortcutsAllowedToolNames.insert("selectPreviousPane");
    keyboardShortcutsAllowedToolNames.insert("loadSeriesInPane");
    keyboardShortcutsAllowedToolNames.insert("toggleOverlayText");
    keyboardShortcutsAllowedToolNames.insert("toggleOverlayIcons");
    keyboardShortcutsAllowedToolNames.insert("print");
    keyboardShortcutsAllowedToolNames.insert("null");

    Json::Value::Members members = keyboardShortcuts.getMemberNames();

    for (size_t i = 0; i < members.size(); i++)
    {
      std::string shortcut = members[i];

      if (!keyboardShortcuts[shortcut].isNull()) {
        std::string toolName = keyboardShortcuts[shortcut].asString();

        if (keyboardShortcutsAllowedToolNames.find(toolName) == keyboardShortcutsAllowedToolNames.end()) {
          OrthancPluginLogError(_context, (std::string("KeyboardShortcut invalid toolName: ") + toolName).c_str());
          throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
        }
      }
    }
  }

  {// validate mouse wheel
    std::set<std::string> mouseWheelAllowedDirections;
    mouseWheelAllowedDirections.insert("up");
    mouseWheelAllowedDirections.insert("down");

    std::set<std::string> mouseWheelAllowedToolNames;
    mouseWheelAllowedToolNames.insert("nextImage");
    mouseWheelAllowedToolNames.insert("previousImage");
    mouseWheelAllowedToolNames.insert("zoomIn");
    mouseWheelAllowedToolNames.insert("zoomOut");

    Json::Value::Members members = mouseWheelBehaviour.getMemberNames();

    for (size_t i = 0; i < members.size(); i++)
    {
      std::string direction = members[i];

      if (mouseWheelAllowedDirections.find(direction) == mouseWheelAllowedDirections.end()) {
        OrthancPluginLogError(_context, (std::string("MouseWheelBehaviour invalid direction: ") + direction).c_str());
        throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
      }

      if (!mouseWheelBehaviour[direction].isNull()) {
        std::string toolName = mouseWheelBehaviour[direction].asString();
        if (mouseWheelAllowedToolNames.find(toolName) == mouseWheelAllowedToolNames.end()) {
          OrthancPluginLogError(_context, (std::string("MouseWheelBehaviour invalid toolName: ") + toolName).c_str());
          throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
        }
      }
    }

  }

  {// validate keyboard shortcuts
    std::set<std::string> infoPopupAllowedValues;
    infoPopupAllowedValues.insert("always");
    infoPopupAllowedValues.insert("never");
    infoPopupAllowedValues.insert("user");

    if (infoPopupAllowedValues.find(showInfoPopupAtStartup) == infoPopupAllowedValues.end()) {
        OrthancPluginLogError(_context, (std::string("ShowInfoPopupAtStartup invalid value: ") + showInfoPopupAtStartup).c_str());
        throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
    }
  }

}

void WebViewerConfiguration::parseFile()
{
  /* Read the configuration of the Web viewer */
  try
  {
    Json::Value configuration;
    if (!OrthancPlugins::ReadConfiguration(configuration, _context))
    {
      throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
    }

    shortTermCachePath = OrthancPlugins::GetStringValue(configuration, "StorageDirectory", "."); // By default, the cache of the Web viewer is located inside the "StorageDirectory" of Orthanc
    shortTermCachePath /= "OsimisWebViewerCache";

    static const char* CONFIG_WEB_VIEWER = "WebViewer";
    if (configuration.isMember(CONFIG_WEB_VIEWER)) {
      // Parse the config content using an overridable method.
      _parseFile(configuration[CONFIG_WEB_VIEWER]);
    } else {
      _parseFile(Json::objectValue);
    }

  }
  /* Log on error and rethrow */
  catch (std::runtime_error& e)
  {
    OrthancPluginLogError(_context, e.what());
    throw;
  }
  catch (Orthanc::OrthancException& e)
  {
    if (e.GetErrorCode() == Orthanc::ErrorCode_BadFileFormat)
    {
      OrthancPluginLogError(_context, "Unable to read the configuration of the Web viewer plugin");
    }
    else
    {
      OrthancPluginLogError(_context, e.What());
    }
    throw;
  }
}

Json::Value WebViewerConfiguration::getFrontendConfig() const {
  Json::Value config;

  // Register "version"
  // @todo move external requests out of model object (cleaner)
  {
    Json::Value system;
    if (!OrthancPlugins::GetJsonFromOrthanc(system, _context, "/system"))
    {
      throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_InexistentItem));
    }
    config["version"]["orthanc"] = system["Version"].asString();
    config["version"]["db"] = system["DatabaseVersion"].asString();
  }

  {
    Json::Value plugin;
    // @warning @todo don't use /plugins/*osimis-web-viewer* route !! May change in wv-pro
    if (!OrthancPlugins::GetJsonFromOrthanc(plugin, _context, "/plugins/osimis-web-viewer"))
    {
      throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_InexistentItem));
    }
    config["version"]["webviewer"] = plugin["Version"].asString();
  }

  config["keyboardShortcutsEnabled"] = keyboardShortcutsEnabled;
  config["studyDownloadEnabled"] = studyDownloadEnabled;
  config["videoDisplayEnabled"] = videoDisplayEnabled;
  config["annotationStorageEnabled"] = annotationStorageEnabled;
  config["keyImageCaptureEnabled"] = keyImageCaptureEnabled;
  config["downloadAsJpegEnabled"] = downloadAsJpegEnabled;
  config["combinedToolEnabled"] = combinedToolEnabled;
  config["printEnabled"] = printEnabled;
  config["openAllPatientStudies"] = openAllPatientStudies;
  config["showStudyInformationBreadcrumb"] = false;  // removed as part of WVB-397
  config["windowingPresets"] = windowingPresets;
  config["combinedToolBehaviour"] = combinedToolBehaviour;
  config["windowingBehaviour"] = windowingBehaviour;
  config["mouseWheelBehaviour"] = mouseWheelBehaviour;
  config["keyboardShortcuts"] = keyboardShortcuts;
  config["highQualityImagePreloadingEnabled"] = highQualityImagePreloadingEnabled;
  config["reduceTimelineHeightOnSingleFrameSeries"] = reduceTimelineHeightOnSingleFrameSeries;
  config["showNoReportIconInSeriesList"] = showNoReportIconInSeriesList;
  config["toolbarLayoutMode"] = toolbarLayoutMode;
  config["toolbarButtonSize"] = toolbarButtonSize;
  config["defaultSelectedTool"] = defaultSelectedTool;
  config["defaultStudyIslandsDisplayMode"] = defaultStudyIslandsDisplayMode;
  config["defaultLanguage"] = defaultLanguage;
  config["synchronizedBrowsingEnabled"] = synchronizedBrowsingEnabled;
  config["referenceLinesEnabled"] = referenceLinesEnabled;
  config["crossHairEnabled"] = crossHairEnabled;
  config["toggleOverlayTextButtonEnabled"] = toggleOverlayTextButtonEnabled;
  config["toggleOverlayIconsButtonEnabled"] = toggleOverlayIconsButtonEnabled;
  config["displayOverlayText"] = displayOverlayText;
  config["displayOverlayIcons"] = displayOverlayIcons;
  config["customCommandEnabled"] = customCommandEnabled;
  config["customCommandIconClass"] = customCommandIconClass;
  config["customCommandIconLabel"] = customCommandIconLabel;
  config["dateFormat"] = dateFormat;

  if (customOverlayProviderUrl.length() > 0) {
    config["customOverlayProviderUrl"] = customOverlayProviderUrl;
  }

  config["documentationUrl"] = documentationUrl;
  config["showInfoPopupAtStartup"] = showInfoPopupAtStartup;
  config["showInfoPopupButtonEnabled"] = showInfoPopupButtonEnabled;
  config["alwaysShowNotForDiagnosticUsageDisclaimer"] = alwaysShowNotForDiagnosticUsageDisclaimer;

  return config;
}
