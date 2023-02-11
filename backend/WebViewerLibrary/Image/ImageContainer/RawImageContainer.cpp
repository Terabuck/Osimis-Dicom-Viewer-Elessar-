#include "RawImageContainer.h"

#include "../../ViewerToolbox.h" // for Convert

using namespace boost;

RawImageContainer::RawImageContainer(OrthancPluginImage* data)
{
  dataAsImageBuffer_ = NULL;
  dataAsImageWrapper_ = new OrthancPlugins::OrthancImageWrapper(OrthancContextManager::Get(), data);

  // @todo AssignReadOnly ?
  accessor_.AssignWritable(OrthancPlugins::Convert(dataAsImageWrapper_->GetFormat()), dataAsImageWrapper_->GetWidth(),
                            dataAsImageWrapper_->GetHeight(), dataAsImageWrapper_->GetPitch(), dataAsImageWrapper_->GetBuffer());
}

RawImageContainer::RawImageContainer(Orthanc::ImageBuffer* data)
{
  data->GetWriteableAccessor(accessor_);
  dataAsImageBuffer_ = data;
  dataAsImageWrapper_ = NULL;
}

RawImageContainer::~RawImageContainer() 
{
  if (dataAsImageWrapper_)
  {
    // @todo check if content is freed at destruction ?
    delete dataAsImageWrapper_;
  }

  if (dataAsImageBuffer_)
  {
    // @todo check if content is freed at destruction ?
    delete dataAsImageBuffer_;
  }
}

const char* RawImageContainer::GetBinary() const
{
  return reinterpret_cast<const char *>(accessor_.GetConstBuffer());
}
uint32_t RawImageContainer::GetBinarySize() const
{
  return accessor_.GetSize(); // height * pitch
}

Orthanc::ImageAccessor* RawImageContainer::GetOrthancImageAccessor()
{
  return &accessor_;
}


//RawImageContainer::gil_image_view_t RawImageContainer::GetGILImageView()
//{
//  Orthanc::PixelFormat format = accessor_.GetFormat();

//  ptrdiff_t w = accessor_.GetWidth();
//  ptrdiff_t h = accessor_.GetHeight();
//  ptrdiff_t rowWidth = accessor_.GetPitch();

//  switch (format)
//  {
//    case Orthanc::PixelFormat_Grayscale8:
//    {
//      gil::gray8_pixel_t* iterator = (gil::gray8_pixel_t*) accessor_.GetBuffer();
//      gil::gray8_view_t view = gil::interleaved_view(w, h, iterator, rowWidth);
//      return gil_image_view_t(view);
//      break;
//    }
//    case Orthanc::PixelFormat_Grayscale16:
//    {
//      gil::gray16_pixel_t* iterator = (gil::gray16_pixel_t*) accessor_.GetBuffer();
//      gil::gray16_view_t view = gil::interleaved_view(w, h, iterator, rowWidth);
//      return gil_image_view_t(view);
//      break;
//    }
//    case Orthanc::PixelFormat_SignedGrayscale16:
//    {
//      gil::gray16s_pixel_t* iterator = (gil::gray16s_pixel_t*) accessor_.GetBuffer();
//      gil::gray16s_view_t view = gil::interleaved_view(w, h, iterator, rowWidth);
//      return gil_image_view_t(view);
//      break;
//    }
//    case Orthanc::PixelFormat_RGB24:
//    {
//      gil::rgb8_pixel_t* iterator = (gil::rgb8_pixel_t*) accessor_.GetBuffer();
//      gil::rgb8_view_t view = gil::interleaved_view(w, h, iterator, rowWidth);
//      return gil_image_view_t(view);
//      break;
//    }
//    default:
//      throw std::invalid_argument("Unsupported image format");
//  }

//}
