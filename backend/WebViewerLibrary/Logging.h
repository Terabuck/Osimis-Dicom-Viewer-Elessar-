#pragma once

ORTHANC_PLUGIN_INLINE void OrthancPluginLogDebug(
  OrthancPluginContext* context,
  const char* message)
{
  OrthancPluginLogInfo(context, message);
}