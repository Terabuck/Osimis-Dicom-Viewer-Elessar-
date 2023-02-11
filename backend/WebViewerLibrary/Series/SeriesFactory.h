#pragma once

#include <memory>
#include <json/value.h>
#include "../Image/AvailableQuality/IAvailableQualityPolicy.h"
#include "Series.h"

class SeriesFactory : public boost::noncopyable {
public:
  SeriesFactory(std::auto_ptr<IAvailableQualityPolicy> availableQualityPolicy); // takes ownership

  std::auto_ptr<Series> CreateSeries(const std::string& seriesId,
                                     const Json::Value& slicesShort,
                                     const Json::Value& middleInstanceMetaInfoTags,
                                     const Json::Value& middleInstanceInfos,
                                     const Json::Value& instancesInfos,
                                     const Json::Value& studyInfo);


private:
  const std::auto_ptr<IAvailableQualityPolicy> _availableQualityPolicy;
};
