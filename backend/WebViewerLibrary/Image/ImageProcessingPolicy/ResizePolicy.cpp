#include "ResizePolicy.h"

#include <Core/OrthancException.h>

#include "../../Logging.h"
#include "../../BenchmarkHelper.h"

ResizePolicy::ResizePolicy(unsigned int maxWidthHeight)
{
  // Limit resizing between 25x25 & 10000x10000.
  if (maxWidthHeight < 25 || maxWidthHeight > 10000) {
    throw Orthanc::OrthancException(Orthanc::ErrorCode_ParameterOutOfRange);
  }

  // Set the max width/height variable.
  maxWidthHeight_ = maxWidthHeight;
}

std::auto_ptr<IImageContainer> ResizePolicy::Apply(std::auto_ptr<IImageContainer> input, ImageMetaData* metaData)
{
  BENCH(RESIZE_IMAGE)
      OrthancPluginLogDebug(OrthancContextManager::Get(), "ImageProcessingPolicy: ResizePolicy");

  // Except *raw* image
  RawImageContainer* inRawImage = dynamic_cast<RawImageContainer*>(input.get());
  if (inRawImage == NULL) {
    // Throw bad request exception if this policy has been used with
    // non-raw-data image. This happen for instance when we use the jpeg policy
    // two times (<...>/jpeg:80/resize:1000). The second one wont have access to
    // raw pixels since the first policy compresses the pixels.
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadRequest);
  }

  Orthanc::ImageAccessor* accessor = inRawImage->GetOrthancImageAccessor();

  // Keep the same scale
  unsigned int inWidth = accessor->GetWidth();
  unsigned int inHeight = accessor->GetHeight();
  unsigned int inPitch = accessor->GetPitch();
  unsigned int outWidth = 0;
  unsigned int outHeight = 0;
  unsigned int outPitch = 0;
  double scale = (double)inHeight / inWidth;

  if (inWidth >= inHeight) {
    outWidth = maxWidthHeight_;
    outHeight = maxWidthHeight_ * scale;
  }
  else {
    outHeight = maxWidthHeight_;
    outWidth = maxWidthHeight_ * (1/scale);
  }
  
  // Create output image buffer
  std::auto_ptr<Orthanc::ImageBuffer> outBuffer(new Orthanc::ImageBuffer());

  // Use the input format for output
  outBuffer->SetFormat(accessor->GetFormat());
  outBuffer->SetWidth(outWidth);
  outBuffer->SetHeight(outHeight);

  Orthanc::ImageAccessor outAccessor;
  outBuffer->GetWriteableAccessor(outAccessor);
  outPitch = outAccessor.GetPitch();

  {// nearest neighbour resizing

    unsigned int bytesPerPixels = accessor->GetBytesPerPixel();
    const char* inBuffer = reinterpret_cast<const char*>(accessor->GetConstBuffer());
    char* outBuffer = reinterpret_cast<char*>(outAccessor.GetBuffer());
    unsigned int widthRatio = (unsigned int)((inWidth<<16)/outWidth) +1;  // the <<16 shifts are there to avoid using floats computation (and also avoi int -> float -> int conversions)
    unsigned int heightRatio = (unsigned int)((inHeight<<16)/outHeight) +1;

    int x2, y2;
    const char* inLineBuffer;
    char* out;
    char* outLineBuffer = outBuffer;

    if (bytesPerPixels == 1)
    {
      for (unsigned int i = 0; i < outHeight; i++, outLineBuffer += outPitch)
      {
        y2 = (( i * heightRatio) >> 16) ;
        inLineBuffer = &inBuffer[(y2 * inPitch)];
        out = outLineBuffer;

        for (unsigned int j = 0; j < outWidth; j++, out += bytesPerPixels)
        {
          x2 = (( j * widthRatio) >> 16) ;

          *out = inLineBuffer[x2 * bytesPerPixels];
        }
      }
    }
    else if (bytesPerPixels == 2)
    {
      for (unsigned int i = 0; i < outHeight; i++, outLineBuffer += outPitch)
      {
        y2 = (( i * heightRatio) >> 16) ;
        inLineBuffer = &inBuffer[(y2 * inPitch)];
        out = outLineBuffer;

        for (unsigned int j = 0; j < outWidth; j++, out += bytesPerPixels)
        {
          x2 = (( j * widthRatio) >> 16) ;

          *(unsigned short*)out = *(unsigned short*)&(inLineBuffer[x2 * bytesPerPixels]);
        }
      }
    }
    else
    {
      for (unsigned int i = 0; i < outHeight; i++, outLineBuffer += outPitch)
      {
        y2 = (( i * heightRatio) >> 16) ;
        inLineBuffer = &inBuffer[(y2 * inPitch)];
        out = outLineBuffer;

        for (unsigned int j = 0; j < outWidth; j++)
        {
          x2 = (( j * widthRatio) >> 16) ;

          for (unsigned int b = 0; b < bytesPerPixels; b++, out++)
          {
            *out = inLineBuffer[x2 * bytesPerPixels + b];
          }
        }
      }

    }
  }

  RawImageContainer* outRawImage = new RawImageContainer(outBuffer.release());

  // Update image metadata
  metaData->width = outWidth;
  metaData->height = outHeight;
  metaData->sizeInBytes = outAccessor.GetSize();

  return std::auto_ptr<IImageContainer>(outRawImage);
}

std::string ResizePolicy::ToString() const 
{ 
  return "resize:" + boost::lexical_cast<std::string>(maxWidthHeight_);
}
