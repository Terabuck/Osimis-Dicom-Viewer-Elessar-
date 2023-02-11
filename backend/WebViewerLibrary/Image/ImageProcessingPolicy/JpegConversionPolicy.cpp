#include "JpegConversionPolicy.h"

#include <orthanc/OrthancCPlugin.h> // for OrthancPluginMemoryBuffer
#include <Core/Images/ImageBuffer.h>
#include <Core/OrthancException.h>
#include "../../Logging.h"
#include "../../BenchmarkHelper.h"

#include "../ImageContainer/RawImageContainer.h"
#include "../ImageContainer/CompressedImageContainer.h"
#include "../../OrthancContextManager.h"
#include "../../BenchmarkHelper.h"

JpegConversionPolicy::JpegConversionPolicy(int quality) : quality_(quality)
{
  // Limit quality between 0 & 100.
  if (quality < 0 || quality > 100) {
    throw Orthanc::OrthancException(Orthanc::ErrorCode_ParameterOutOfRange);
  }
}

JpegConversionPolicy::~JpegConversionPolicy()
{
}

std::auto_ptr<IImageContainer> JpegConversionPolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData) {
  BENCH(COMPRESS_FRAME_IN_JPEG);
  OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: JpegConversionPolicy");

  // Except *raw* image
  RawImageContainer* rawImage = dynamic_cast<RawImageContainer*>(input.get());
  if (rawImage == NULL) {
    // Throw bad request exception if this policy has been used with 
    // non-raw-data image. This happen for instance when we use the jpeg policy
    // two times (<...>/jpeg:80/jpeg:80). The second one wont have access to
    // raw pixels since the first policy compresses the pixels.
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadRequest);
  }

  Orthanc::ImageAccessor* accessor = rawImage->GetOrthancImageAccessor();

  // @note we don't use ViewerToolbox::WriteJpegToMemory because it has
  // avoidable memory copy from OrthancPluginMemoryBuffer to std::string
  // using std::string#assign(const char*, size_t);

  OrthancPluginMemoryBuffer buffer; //will be adopted by the CompressedImageContainer so, no need to delete it

  OrthancPluginErrorCode error = OrthancPluginCompressJpegImage(
   OrthancContextManager::Get(), &buffer, OrthancPlugins::Convert(accessor->GetFormat()),
   accessor->GetWidth(), accessor->GetHeight(), accessor->GetPitch(),
   accessor->GetConstBuffer(), quality_
  );

  // Except 8bit image (OrthancPluginErrorCode_ParameterOutOfRange means image
  // is not the right format).
  if (error == OrthancPluginErrorCode_ParameterOutOfRange) {
    // Throw bad request exception if this policy has been used without 8bit
    // image. Jpeg compression indeed sometime requires iamge dynamic reduction
    // since jpeg doesn't handle 16bits dynamic.
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadRequest);
  }

  // Check compression result (may throw on bad_alloc)
  if (error != OrthancPluginErrorCode_Success)
  {
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(error));
  }

  BENCH_LOG(COMPRESSION_JPEG_QUALITY, (int) quality_);
  BENCH_LOG(COMPRESSION_JPEG_SIZE, buffer.size);

  return std::auto_ptr<IImageContainer>(new CompressedImageContainer(buffer));
}
