#include "CornerstoneKLVContainer.h"

#include "../Utilities/KLVWriter.h"
#include "OrthancContextManager.h"

CornerstoneKLVContainer::CornerstoneKLVContainer(std::auto_ptr<IImageContainer> data, const ImageMetaData* metaData) : dataAsMemoryBuffer_(OrthancContextManager::Get())
{
  assert(data.get() != NULL);
  assert(metaData != NULL);

  KLVWriter klvWriter;

  // set metadata
  klvWriter.setValue(Height, metaData->height);
  klvWriter.setValue(Width, metaData->width);
  klvWriter.setValue(SizeInBytes, metaData->sizeInBytes); 

  klvWriter.setValue(MinPixelValue, metaData->minPixelValue);
  klvWriter.setValue(MaxPixelValue, metaData->maxPixelValue);

  klvWriter.setValue(Stretched, metaData->stretched);

  // set image binary
  klvWriter.setValue(ImageBinary, data->GetBinarySize(), data->GetBinary());

  // write klv binary
  dataAsString_ = klvWriter.write();
}

CornerstoneKLVContainer::CornerstoneKLVContainer(OrthancPluginMemoryBuffer& data) : dataAsMemoryBuffer_(OrthancContextManager::Get(), data)
{
}


const char* CornerstoneKLVContainer::GetBinary() const
{
  if (dataAsMemoryBuffer_.getData() != NULL)
  {
    return static_cast<const char*>(dataAsMemoryBuffer_.getData());
  }
  else 
  {
    return dataAsString_.c_str();
  }
}
uint32_t CornerstoneKLVContainer::GetBinarySize() const
{
  if (dataAsMemoryBuffer_.getData() != NULL)
  {
    return dataAsMemoryBuffer_.getSize();
  }
  else
  {
    return dataAsString_.length();
  }
}
