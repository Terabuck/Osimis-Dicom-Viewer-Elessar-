#include "LowQualityPolicy.h"
#include "ResizePolicy.h"
#include "Uint8ConversionPolicy.h"
#include "JpegConversionPolicy.h"
#include "KLVEmbeddingPolicy.h"
#include "../../Logging.h"

LowQualityPolicy::LowQualityPolicy()
{
  resampleAndJpegPolicy_.AddPolicy(new ResizePolicy(300));
  resampleAndJpegPolicy_.AddPolicy(new Uint8ConversionPolicy()); // Does nothing if already 8bit
  resampleAndJpegPolicy_.AddPolicy(new JpegConversionPolicy(100));
  resampleAndJpegPolicy_.AddPolicy(new KLVEmbeddingPolicy());

  // @todo move instantiation out of controller
}

LowQualityPolicy::~LowQualityPolicy()
{
}

std::auto_ptr<IImageContainer> LowQualityPolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData)
{
  OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: LowQualityPolicy");
  return resampleAndJpegPolicy_.Apply(input, metaData);
}
