#pragma once

#include <boost/thread.hpp>
#include <boost/lexical_cast.hpp>
#include "Core/IDynamicObject.h"
#include "Core/SystemToolbox.h"
#include "Core/FileStorage/FilesystemStorage.h"
#include "Core/SQLite/Connection.h"
#include "Plugins/Samples/GdcmDecoder/GdcmDecoderCache.h"
#include "CacheManager.h"
#include "CacheScheduler.h"
#include "json/json.h"
#include "ViewerToolbox.h"

class SeriesRepository;

enum CacheBundle
{
  CacheBundle_DecodedImage = 1,
//  CacheBundle_InstanceInformation = 2,
  CacheBundle_SeriesInformation = 3
};

class CacheLogger
{
  bool debugLogsEnabled_;
  OrthancPluginContext* pluginContext_;
public:
  CacheLogger(OrthancPluginContext* pluginContext, bool debugLogsEnabled)
    : debugLogsEnabled_(debugLogsEnabled),
      pluginContext_(pluginContext)
  {}

  void LogCacheDebugInfo(const std::string& message);
};


class CacheContext
{
private:
  class DynamicString : public Orthanc::IDynamicObject
  {
  private:
    std::string  value_;

  public:
    DynamicString(const char* value) : value_(value)
    {
    }

    const std::string& GetValue() const
    {
      return value_;
    }
  };

  OrthancPluginContext* pluginContext_;
  Orthanc::FilesystemStorage  storage_;
  Orthanc::SQLite::Connection  db_;

  std::auto_ptr<OrthancPlugins::CacheManager>  cacheManager_;
  std::auto_ptr<OrthancPlugins::CacheScheduler>  scheduler_;
  std::auto_ptr<CacheLogger> logger_;
  SeriesRepository* seriesRepository_;

  Orthanc::SharedMessageQueue  newInstances_;
  bool stop_;
  boost::thread newInstancesThread_;
  OrthancPlugins::GdcmDecoderCache  decoder_;
  bool prefetchOnInstanceStored_;

  static void NewInstancesThread(CacheContext* cache);

public:

  CacheContext(const std::string& path,
               OrthancPluginContext* pluginContext,
               bool debugLogsEnabled,
               bool prefetchOnInstanceStored,
               SeriesRepository* seriesRepository);
  ~CacheContext();

  OrthancPlugins::CacheScheduler& GetScheduler()
  {
    return *scheduler_;
  }

  CacheLogger* GetLogger()
  {
    return logger_.get();
  }

  void SignalNewInstance(const char* instanceId)
  {
    logger_->LogCacheDebugInfo(std::string("enqueuing new instance ") + instanceId);
    newInstances_.Enqueue(new DynamicString(instanceId));
  }

  OrthancPlugins::GdcmDecoderCache&  GetDecoder()
  {
    return decoder_;
  }

};

