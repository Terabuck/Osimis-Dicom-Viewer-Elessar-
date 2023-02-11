#include "HighQualityPolicy.h"
#include "PngConversionPolicy.h"
#include "KLVEmbeddingPolicy.h"
#include "../../Logging.h"

HighQualityPolicy::HighQualityPolicy()
{
  pngAndKlvPolicy_.AddPolicy(new PngConversionPolicy());
  pngAndKlvPolicy_.AddPolicy(new KLVEmbeddingPolicy());
}

HighQualityPolicy::~HighQualityPolicy()
{
}

std::auto_ptr<IImageContainer> HighQualityPolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData)
{
  OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: HighQualityPolicy");
  return pngAndKlvPolicy_.Apply(input, metaData);
}
