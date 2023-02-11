#include "Uint8ConversionPolicy.h"

#include <Core/Images/ImageBuffer.h> // for ImageBuffer
#include <Core/Images/ImageProcessing.h> // for ImageProcessing::GetMinMaxValue
#include <Core/OrthancException.h>
#include <stdexcept>
#include "../../Logging.h"
#include "../../BenchmarkHelper.h"

#include "../ImageContainer/RawImageContainer.h"

#include <cmath> // for std::floor

namespace {
  template <typename TargetType, typename SourceType>
  static void ChangeDynamics(Orthanc::ImageAccessor& target,
                             const Orthanc::ImageAccessor& source,
                             SourceType source1, TargetType target1,
                             SourceType source2, TargetType target2);
}

std::auto_ptr<IImageContainer> Uint8ConversionPolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData)
{
  OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: Uint8ConversionPolicy");

  // Except *raw* image
  RawImageContainer* rawInputImage = dynamic_cast<RawImageContainer*>(input.get());
  if (rawInputImage == NULL) {
    // Throw bad request exception if this policy has been used with 
    // non-raw-data image. This happen for instance when we use the jpeg policy
    // two times (<...>/jpeg:80/8bit). The second one wont have access to
    // raw pixels since the first policy compresses the pixels.
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadRequest);
  }

  Orthanc::ImageAccessor* inAccessor = rawInputImage->GetOrthancImageAccessor();
  Orthanc::PixelFormat pixelFormat = inAccessor->GetFormat();

  // When input is 8bit, return it - no conversion required
  if (pixelFormat == Orthanc::PixelFormat_Grayscale8 || pixelFormat == Orthanc::PixelFormat_RGB24)
  {
    return input;
  }

  // Except 16bit image
  if (pixelFormat != Orthanc::PixelFormat_Grayscale16 &&
      pixelFormat != Orthanc::PixelFormat_SignedGrayscale16 &&
      pixelFormat != Orthanc::PixelFormat_RGB48)
  {
    throw std::invalid_argument("Input is not 16bit");
    return std::auto_ptr<IImageContainer>(0);
  }

  BENCH(CONVERT_TO_UINT8);

  // Convert 8bit image to 16bit
  std::auto_ptr<Orthanc::ImageBuffer> outBuffer(new Orthanc::ImageBuffer(
      Orthanc::PixelFormat_Grayscale8,
      inAccessor->GetWidth(),
      inAccessor->GetHeight(),
      true
  ));
  Orthanc::ImageAccessor outAccessor;
  outBuffer->GetWriteableAccessor(outAccessor);

  if (pixelFormat == Orthanc::PixelFormat_Grayscale16)
  {
    ChangeDynamics<uint8_t, uint16_t>(outAccessor, *inAccessor, metaData->minPixelValue, 0, metaData->maxPixelValue, 255);
  }
  else
  {
    ChangeDynamics<uint8_t, int16_t>(outAccessor, *inAccessor, metaData->minPixelValue, 0, metaData->maxPixelValue, 255);
  }

  // Update metadata
  metaData->stretched = true;
  metaData->sizeInBytes = outAccessor.GetSize();
  
  BENCH_LOG(SIZE_IN_BYTES, metaData->sizeInBytes);

  RawImageContainer* rawOutputImage = new RawImageContainer(outBuffer.release()); // @todo take auto ptr as input
  return std::auto_ptr<IImageContainer>(rawOutputImage);
}

namespace {
  template <typename TargetType, typename SourceType>
  static void ChangeDynamics(Orthanc::ImageAccessor& target,
                             const Orthanc::ImageAccessor& source,
                             SourceType source1, TargetType target1,
                             SourceType source2, TargetType target2)
  {
    // Except target image to be compatible with source image
    assert(source.GetWidth() == target.GetWidth() && source.GetHeight() == target.GetHeight());

    float scale = static_cast<float>(target2 - target1) / static_cast<float>(source2 - source1);
    float offset = static_cast<float>(target1) - scale * static_cast<float>(source1);

    const float minValue = static_cast<float>(std::numeric_limits<TargetType>::min());
    const float maxValue = static_cast<float>(std::numeric_limits<TargetType>::max());

    for (unsigned int y = 0; y < source.GetHeight(); y++)
    {
      const SourceType* p = reinterpret_cast<const SourceType*>(source.GetConstRow(y));
      TargetType* q = reinterpret_cast<TargetType*>(target.GetRow(y));

      for (unsigned int x = 0; x < source.GetWidth(); x++, p++, q++)
      {
        float v = (scale * static_cast<float>(*p)) + offset;

        if (v > maxValue)
        {
          *q = std::numeric_limits<TargetType>::max();
        }
        else if (v < minValue)
        {
          *q = std::numeric_limits<TargetType>::min();
        }
        else
        {
          //*q = static_cast<TargetType>(boost::math::iround(v));
          
          // http://stackoverflow.com/a/485546/881731
          *q = static_cast<TargetType>(std::floor(v + 0.5f));
        }
      }
    }
  }
}
