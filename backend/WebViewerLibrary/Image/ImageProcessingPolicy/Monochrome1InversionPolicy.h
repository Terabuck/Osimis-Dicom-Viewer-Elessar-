#pragma once

#include "IImageProcessingPolicy.h"

/**
 * @class Monochrome1InversionPolicy
 * 
 * @pre
 * Stretch the image dynamic to 8 bits (using the `Uint8ConversionPolicy`
 * for instance). As those generic policy are used via http routing, this
 * implies prepending the `/8bit` string to the url, before the
 * `/invert-monochrome1` one used for this policy.
 * 
 * @description
 * Invert the color of the image if its photometric interpretation is
 * MONOCHROME1.
 */
class Monochrome1InversionPolicy : public IImageProcessingPolicy {
public:
  Monochrome1InversionPolicy();
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> data, ImageMetaData* metaData);

  virtual std::string ToString() const;
};