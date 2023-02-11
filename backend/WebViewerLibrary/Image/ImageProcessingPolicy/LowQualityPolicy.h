#pragma once

#include "IImageProcessingPolicy.h"
#include "CompositePolicy.h"

/* LowQualityPolicy
 *
 * @Responsibility Compress image to PNG & embbed in KLV
 *
 */
class LowQualityPolicy : public IImageProcessingPolicy {
public:
  LowQualityPolicy();
  virtual ~LowQualityPolicy();
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData);

  virtual std::string ToString() const
  {
    return "low-quality";
  }

private:
  CompositePolicy resampleAndJpegPolicy_;
};
