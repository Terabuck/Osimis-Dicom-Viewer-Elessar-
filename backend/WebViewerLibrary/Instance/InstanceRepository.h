#pragma once

#include <memory>
#include "../Instance/DicomRepository.h"
#include <orthanc/OrthancCPlugin.h>

#include <json/value.h>

class InstanceRepository : public boost::noncopyable {
  OrthancPluginContext* _context;
  bool _cachingInMetadataEnabled;

public:
  InstanceRepository(OrthancPluginContext* context);

  void EnableCachingInMetadata(bool enable);
  void SignalNewInstance(const std::string& instanceId);

  Json::Value GetInstanceInfo(const std::string& instanceId);

protected:
  void StoreInstanceInfoInMetadata(const std::string& instanceId, const Json::Value& instanceInfo);
  Json::Value GenerateInstanceInfo(const std::string& instanceId);
  static Json::Value SimplifyInstanceTags(const Json::Value& instanceTags);
  static Json::Value SanitizeInstanceInfo(const Json::Value& instanceInfo);
};
