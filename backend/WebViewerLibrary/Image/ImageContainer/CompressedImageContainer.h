#pragma once

#include <orthanc/OrthancCPlugin.h> // for OrthancPluginMemoryBuffer
#include "IImageContainer.h"
#include "../Utilities/ScopedBuffers.h"

// For Jpeg or Png, pure binary with no access to image data
class CompressedImageContainer : public IImageContainer {
public:
  // takes ownership
  CompressedImageContainer(OrthancPluginMemoryBuffer& buffer);
  virtual ~CompressedImageContainer() {}

  virtual const char* GetBinary() const;
  virtual uint32_t GetBinarySize() const;

private:
  ScopedOrthancPluginMemoryBuffer data_;
};

