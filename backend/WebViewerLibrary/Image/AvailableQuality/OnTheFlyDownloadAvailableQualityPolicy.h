#pragma once

#include "IAvailableQualityPolicy.h"

/** OnTheFlyDownloadAvailableQualityPolicy
 *
 * Returns avaible image qualities.
 * It is aimed for servers configured with *disabled* image attachment-based cache
 * as they require specific on-the-fly transfer, without being slowed down by the image
 * compressions which would be thrown away after transfer.
 *
 */
class OnTheFlyDownloadAvailableQualityPolicy : public IAvailableQualityPolicy
{
private:
  // Used to choose MQ based on image size
  bool _isLargerThan(uint32_t width, uint32_t height, const Json::Value& dicomTags);

  // Used to choose either PIXELDATA or LOSSLESS based on transferSyntax
  bool _canBeDecompressedInFrontend(const std::string& headerTags, const Json::Value& dicomTags);

public:
  // Returns available qualities depending on the image DICOM tags
  // @todo use image as an input
  virtual std::set<ImageQuality::EImageQuality> retrieve(const std::string& transferSyntax, const Json::Value& dicomTags);
};
