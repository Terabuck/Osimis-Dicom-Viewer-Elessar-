#ifndef UINT8_CONVERSION_POLICY_H
#define UINT8_CONVERSION_POLICY_H

#include "IImageProcessingPolicy.h"

class Uint8ConversionPolicy : public IImageProcessingPolicy {
public:
  // in: RawImageContainer PixelFormat_Grayscale16 || PixelFormat_Grayscale16
  // out: RawImageContainer PixelFormat_Grayscale8
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData);

  virtual std::string ToString() const 
  { 
    return "8bit";
  }
};

#endif // UINT8_CONVERSION_POLICY_H
