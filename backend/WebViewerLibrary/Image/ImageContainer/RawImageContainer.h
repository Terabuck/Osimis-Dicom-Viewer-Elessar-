#ifndef PIXELDATA_IMAGE_CONTAINER_H
#define PIXELDATA_IMAGE_CONTAINER_H

//#include <boost/gil/gil_all.hpp>
//#include <boost/mpl/vector.hpp> // for mpl::vector
//#include <boost/gil/extension/dynamic_image/dynamic_image_all.hpp> // for any_image_view

#include <Plugins/Samples/GdcmDecoder/OrthancImageWrapper.h> // for OrthancImageWrapper
#include <Core/Images/ImageAccessor.h> // for ImageAccessor
#include <Core/Images/ImageBuffer.h> // for ImageBuffer

#include "../../OrthancContextManager.h"
#include "../../ViewerToolbox.h" // for OrthancPluginImage
#include "IImageContainer.h"

class RawImageContainer : public IImageContainer {
public:
  // takes ownership
  RawImageContainer(OrthancPluginImage* data);
  // takes ownership
  RawImageContainer(Orthanc::ImageBuffer* data);

  virtual ~RawImageContainer();

  virtual const char* GetBinary() const;
  virtual uint32_t GetBinarySize() const;

  // can be used by ImageProcessingPolicy to retrieve additionnal informations
  Orthanc::ImageAccessor* GetOrthancImageAccessor();

//  // can be used for GIL processing
//  // see gil/extension/typedefs.hpp for available types (defined using macros)
//  typedef boost::gil::any_image_view< boost::mpl::vector4<
//    boost::gil::gray8_view_t, boost::gil::gray16_view_t, boost::gil::gray16s_view_t, boost::gil::rgb8_view_t
//  > > gil_image_view_t;
//  typedef boost::gil::any_image< boost::mpl::vector4<
//    boost::gil::gray8_image_t, boost::gil::gray16_image_t, boost::gil::gray16s_image_t, boost::gil::rgb8_view_t
//  > > gil_image_t;

//  gil_image_view_t GetGILImageView();
private:
  Orthanc::ImageBuffer* dataAsImageBuffer_;
  OrthancPlugins::OrthancImageWrapper* dataAsImageWrapper_;
  Orthanc::ImageAccessor accessor_;
};

#endif // PIXELDATA_IMAGE_CONTAINER_H
