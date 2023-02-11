#ifndef I_IMAGE_PROCESSING_POLICY_H
#define I_IMAGE_PROCESSING_POLICY_H

#include "../ImageContainer/IImageContainer.h"
#include "../ImageMetaData.h"
#include <string>

class IImageProcessingPolicy {
public:
  virtual ~IImageProcessingPolicy() {};
  virtual std::auto_ptr<IImageContainer> Apply(std::auto_ptr<IImageContainer> container, ImageMetaData* metaData) = 0;

  // to create a generic route based on composed policies
  virtual std::string ToString() const = 0;
};

#endif // I_IMAGE_PROCESSING_POLICY_H
