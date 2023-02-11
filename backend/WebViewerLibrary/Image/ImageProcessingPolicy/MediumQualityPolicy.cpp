#include "MediumQualityPolicy.h"
#include "ResizePolicy.h"
#include "Uint8ConversionPolicy.h"
#include "JpegConversionPolicy.h"
#include "KLVEmbeddingPolicy.h"
#include "../../Logging.h"

MediumQualityPolicy::MediumQualityPolicy()
{
  resampleAndJpegPolicy_.AddPolicy(new ResizePolicy(1000));
  resampleAndJpegPolicy_.AddPolicy(new Uint8ConversionPolicy()); // Does nothing if already 8bit
  resampleAndJpegPolicy_.AddPolicy(new JpegConversionPolicy(80));
  resampleAndJpegPolicy_.AddPolicy(new KLVEmbeddingPolicy());

  // @todo move instantiation out of controller
}

MediumQualityPolicy::~MediumQualityPolicy()
{
}

std::auto_ptr<IImageContainer> MediumQualityPolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData)
{
  OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: MediumQualityPolicy");
  return resampleAndJpegPolicy_.Apply(input, metaData);
}
