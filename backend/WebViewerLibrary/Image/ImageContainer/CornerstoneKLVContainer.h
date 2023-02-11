#pragma once

#include <string>

#include "IImageContainer.h"
#include "../ImageMetaData.h"
#include "../Utilities/ScopedBuffers.h"

class CornerstoneKLVContainer : public IImageContainer {
public:
  // does not take ownership
  CornerstoneKLVContainer(std::auto_ptr<IImageContainer> data, const ImageMetaData* metaData);
  // takes ownership
  CornerstoneKLVContainer(OrthancPluginMemoryBuffer& data);
  virtual ~CornerstoneKLVContainer() {}

  virtual const char* GetBinary() const;
  virtual uint32_t GetBinarySize() const;

private:
  std::string dataAsString_;
  ScopedOrthancPluginMemoryBuffer dataAsMemoryBuffer_;

  enum Keys
  {
    // - Meta Data (see ImageMetaData.h for informations)
    Height,
    Width,
    SizeInBytes,
    MinPixelValue,
    MaxPixelValue,
    Stretched,

    // - Image binary
    ImageBinary
  };
};
