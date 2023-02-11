#include "Monochrome1InversionPolicy.h"

#include <Core/Images/ImageProcessing.h>
#include <Core/OrthancException.h>

#include "../../Logging.h"
#include "../../BenchmarkHelper.h"

Monochrome1InversionPolicy::Monochrome1InversionPolicy()
{
}

std::auto_ptr<IImageContainer> Monochrome1InversionPolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData)
{
  // Invert the image colour, but only if the photometric interpretation is
  // MONOCHROME1 (see the `ImageMetaData` class' source code).
  if (metaData->inverted) {
    BENCH(MONOCHROME1_INVERSION)
    OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: Monochrome1InversionPolicy");

    // Except *raw* image
    RawImageContainer* inRawImage = dynamic_cast<RawImageContainer*>(input.get());
    if (inRawImage == NULL) {
      // Throw bad request exception if this policy has been used with 
      // non-raw-data image. This happen for instance when we use the jpeg policy
      // two times (<...>/jpeg:80/invert-monochrome1). The second one wont have access to
      // raw pixels since the first policy compresses the pixels.
      throw Orthanc::OrthancException(Orthanc::ErrorCode_BadRequest);
    }

    Orthanc::ImageAccessor* accessor = inRawImage->GetOrthancImageAccessor();

    // This throws `ErrorCode_NotImplemented` if the image is not in 8bit !
    Orthanc::ImageProcessing::Invert(*accessor);
  }

  return input;
}

std::string Monochrome1InversionPolicy::ToString() const 
{ 
  return "invert-monochrome1";
}
