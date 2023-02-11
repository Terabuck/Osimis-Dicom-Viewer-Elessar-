#pragma once

#include "IImageProcessingPolicy.h"

class PngConversionPolicy : public IImageProcessingPolicy {
public:
  // @throws Orthanc::OrthancException
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> data, ImageMetaData* metaData);

  virtual std::string ToString() const 
  { 
    return "png";
  }
};