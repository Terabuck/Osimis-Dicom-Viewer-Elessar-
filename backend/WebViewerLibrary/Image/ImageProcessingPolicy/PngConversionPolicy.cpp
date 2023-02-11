#include "PngConversionPolicy.h"

#include <orthanc/OrthancCPlugin.h> // for OrthancPluginMemoryBuffer & OrthancPluginCompressPngImage
#include <Core/Images/ImageBuffer.h>
#include <Core/OrthancException.h>
#include "../../Logging.h"
#include "../../BenchmarkHelper.h"

#include "../ImageContainer/RawImageContainer.h"
#include "../ImageContainer/CompressedImageContainer.h"
#include "../../OrthancContextManager.h"
#include "../../BenchmarkHelper.h"

std::auto_ptr<IImageContainer> PngConversionPolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData) {
  BENCH(COMPRESS_FRAME_IN_PNG);
  OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: PngConversionPolicy");

  // Except *raw* image
  RawImageContainer* rawImage = dynamic_cast<RawImageContainer*>(input.get());
  if (rawImage == NULL) {
    // Throw bad request exception if this policy has been used with 
    // non-raw-data image. This happen for instance when we use the jpeg policy
    // two times (<...>/jpeg:80/png). The second one wont have access to
    // raw pixels since the first policy compresses the pixels.
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadRequest);
  }

  Orthanc::ImageAccessor* accessor = rawImage->GetOrthancImageAccessor();

  OrthancPluginMemoryBuffer buffer; // will be adopted by the CompressedImageContainer so, no need to delete it

  OrthancPluginErrorCode error = OrthancPluginCompressPngImage(
   OrthancContextManager::Get(), &buffer, OrthancPlugins::Convert(accessor->GetFormat()),
   accessor->GetWidth(), accessor->GetHeight(), accessor->GetPitch(),
   accessor->GetConstBuffer()
  );

  // Check compression result (may throw on bad_alloc)
  if (error != OrthancPluginErrorCode_Success)
  {
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(error));
  }

  BENCH_LOG(COMPRESSION_PNG_SIZE, buffer.size);

  return std::auto_ptr<IImageContainer>(new CompressedImageContainer(buffer));
}
