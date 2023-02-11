#pragma once

#include <memory>
#include "../Instance/DicomRepository.h"
#include <orthanc/OrthancCPlugin.h>
#include "Series.h"
#include "SeriesFactory.h"

class InstanceRepository;

/** SeriesRepository [@Repository]
 *
 * Retrieve a Series from an uid.
 *
 * @Responsibility Handle all the I/O operations related to Series
 *
 */
class SeriesRepository : public boost::noncopyable {

  OrthancPluginContext* _context;
  DicomRepository* _dicomRepository;
  InstanceRepository* _instanceRepository;
  SeriesFactory _seriesFactory;
  bool _cachingInMetadataEnabled;

public:
  SeriesRepository(OrthancPluginContext* _context, DicomRepository* dicomRepository, InstanceRepository* instanceRepository);

  // @throws Orthanc::OrthancException(OrthancPluginErrorCode_InexistentItem)
  std::auto_ptr<Series> GetSeries(const std::string& seriesId, bool getInstanceTags = true);
  void EnableCachingInMetadata(bool enable);

private:

  std::auto_ptr<Series> GenerateSeriesInfo(const std::string& seriesId, bool getInstanceTags);
  void StoreSeriesInfoInMetadata(const std::string& seriesId, const Series& series);

};
