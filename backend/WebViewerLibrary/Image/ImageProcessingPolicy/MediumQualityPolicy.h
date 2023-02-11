#pragma once

#include "IImageProcessingPolicy.h"
#include "CompositePolicy.h"

/* MediumQualityPolicy
 *
 * @Responsibility Resize to 1000x1000, convert image 8 bit if needed (to allow jpeg compression)
 *   & compress in jpeg (quality:100)
 *
 */
class MediumQualityPolicy : public IImageProcessingPolicy {
public:
  MediumQualityPolicy();
  virtual ~MediumQualityPolicy();
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData);

  virtual std::string ToString() const
  {
    return "medium-quality";
  }

private:
  CompositePolicy resampleAndJpegPolicy_;
};
