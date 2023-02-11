#include "KLVEmbeddingPolicy.h"

#include "../../BenchmarkHelper.h"
#include "../../Logging.h"
#include "../ImageContainer/CornerstoneKLVContainer.h"

std::auto_ptr<IImageContainer> KLVEmbeddingPolicy::Apply(std::auto_ptr<IImageContainer> data, ImageMetaData* metaData)
{
  BENCH(EMBED_IN_KLV)
  OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: KLVEmbeddingPolicy");

  std::auto_ptr<IImageContainer> klvContainer(new CornerstoneKLVContainer(data, metaData));
  assert(klvContainer.get() != NULL);

  return klvContainer;
}