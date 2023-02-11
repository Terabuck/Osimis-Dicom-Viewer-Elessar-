#pragma once

#include <boost/lexical_cast.hpp>
#include "IImageProcessingPolicy.h"

class ResizePolicy : public IImageProcessingPolicy {
public:
  /**
   * @class ResizePolicy
   *
   * @param maxWidthHeight
   * The maximum width and height of the resized image. The image will keep its
   * proportion. Its largest sides will fit to the `maxWidthHeight` value,
   * while the smallest will be scaled down accordingly.
   * The minimum value is `25` px, while the maximum one is `1000` px.
   */
  ResizePolicy(unsigned int maxWidthHeight);
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> data, ImageMetaData* metaData);

  virtual std::string ToString() const;

private:
  unsigned int maxWidthHeight_;
};