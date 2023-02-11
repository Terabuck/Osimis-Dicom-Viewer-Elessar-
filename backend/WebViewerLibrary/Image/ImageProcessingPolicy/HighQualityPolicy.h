#pragma once

#include "IImageProcessingPolicy.h"
#include "CompositePolicy.h"

/* HighQualityPolicy
 *
 * @Responsibility Compress image to PNG & embbed in KLV
 *
 */
class HighQualityPolicy : public IImageProcessingPolicy {
public:
  HighQualityPolicy();
  virtual ~HighQualityPolicy();
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData);

  virtual std::string ToString() const
  {
    return "high-quality";
  }

private:
  CompositePolicy pngAndKlvPolicy_;
};
