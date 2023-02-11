#include "CompressedImageContainer.h"

#include "OrthancContextManager.h"

CompressedImageContainer::CompressedImageContainer(OrthancPluginMemoryBuffer& buffer): data_(OrthancContextManager::Get(), buffer) {
}

const char* CompressedImageContainer::GetBinary() const {
  return reinterpret_cast<const char*>(data_.getData());
}
uint32_t CompressedImageContainer::GetBinarySize() const {
  return data_.getSize();
}
