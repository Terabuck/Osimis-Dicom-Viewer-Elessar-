#include "SeriesFactory.h"

#include <memory>
#include <json/json.h>

#include <Core/OrthancException.h> // For _getTransferSyntax

namespace {
}

SeriesFactory::SeriesFactory(std::auto_ptr<IAvailableQualityPolicy> availableQualityPolicy)
    : _availableQualityPolicy(availableQualityPolicy)
{

}

std::auto_ptr<Series> SeriesFactory::CreateSeries(const std::string& seriesId,
                                                  const Json::Value& slicesShort,
                                                  const Json::Value& middleInstanceMetaInfoTags,
                                                  const Json::Value& middleInstanceInfos,
                                                  const Json::Value& instancesInfos,
                                                  const Json::Value& studyInfo)
{
  std::string contentType;
  std::set<ImageQuality::EImageQuality> imageQualities;

  // Check the middle instance's type (`[multiframe] image / pdf / image`
  // instance.
  Json::Value mimeType = middleInstanceInfos["TagsSubset"]["MIMETypeOfEncapsulatedDocument"];
  std::string transferSyntax = middleInstanceMetaInfoTags["TransferSyntax"].asString();

  // If the middle instance is a `pdf` instance, set `pdf` type & keep 
  // available qualities empty.
  if (mimeType.isString() && mimeType.asString().compare("application/pdf") == 0) {
    contentType = "pdf";
  }
  // If the middle instance is a `video` instance, set `video` type & keep
  // available qualities empty.
  // 1. MPEG2
  else if (
    transferSyntax.compare("1.2.840.10008.1.2.4.100") == 0 ||
    transferSyntax.compare("1.2.840.10008.1.2.4.101") == 0
  ) {
    // @warning probably unsupported by browser, should be converted to mpeg4?
    contentType = "video/mpeg2";
  }
  // 2. MPEG4
  else if (transferSyntax.compare("1.2.840.10008.1.2.4.102") == 0) {
    contentType = "video/mpeg4";
  }
  // 3. MPEG4 Blueray
  // @warning .103 (blueray) will probably not work on low end hardware such
  // as iphone.
  else if (transferSyntax.compare("1.2.840.10008.1.2.4.103") == 0) {
    contentType = "video/mpeg4-bd";
  }
  // If the middle instance is a `multiframe/image` instance, set `image`
  // type & suggest available qualities.
  else {
    contentType = "image";

    // Retrieve available image formats. This may throw if dicom instance is
    // in fact not related to image. Therefore, we rely on this exception to 
    // deliver HTTP 500 error on unsupported format.
    imageQualities = _availableQualityPolicy->retrieve(middleInstanceMetaInfoTags["TransferSyntax"].asString(), middleInstanceInfos["TagsSubset"]);
  }
  
  // Create the series
  return std::auto_ptr<Series>(new Series(seriesId, contentType, middleInstanceInfos, instancesInfos, slicesShort, imageQualities, studyInfo));
}
