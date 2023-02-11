#include "PixelDataQualityPolicy.h"
#include "../../Logging.h"

PixelDataQualityPolicy::PixelDataQualityPolicy()
{
}

PixelDataQualityPolicy::~PixelDataQualityPolicy()
{
}

std::auto_ptr<IImageContainer> PixelDataQualityPolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData)
{
  OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: PixelDataQualityPolicy");
  return _klvPolicy.Apply(input, metaData);
}
