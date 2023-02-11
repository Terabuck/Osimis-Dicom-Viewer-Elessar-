#pragma once

#include <string>
#include <boost/cstdint.hpp> // for uint32_t
#include <json/writer.h> // for Json::Value

#include <Core/DicomFormat/DicomMap.h>
#include "ImageContainer/RawImageContainer.h"
#include "ImageContainer/IImageContainer.h"

/** ImageMetaData [@Entity]
 * 
 */
struct ImageMetaData : public boost::noncopyable {
  ImageMetaData();

  // @todo const RawImageContainer
  
  // This constructor is called when the image object is created from an
  // uncompressed image. We thus have direct access to the raw pixel.
  // @deprecated since we should only do pixel-based computations on the
  //     frontend since we can't always rely on them.
  ImageMetaData(RawImageContainer* rawImage, const Json::Value& dicomTags);

  // This constructor is called when the image object is created from a
  // compressed image embedded within the dicom file. We use it for performance
  // optimisation (so we don't have to decompress the whole image and then
  // recompress it).
  ImageMetaData(const Orthanc::DicomMap& headerTags, const Json::Value& dicomTags);

  // The following attributes are attributes required to process the image in
  // the frontend that are not available from the dicom tags.
  
  // The width and height of the image. Different from the Rows & Columns dicom
  // tags if the image has been resized (using an image processing policy).
  uint32_t height;
  uint32_t width;
  // The size in raw prior to compression, it's equals to the dicom tag formula 
  // `Rows * Cols * BitsAllocated * (isColor ? 3 : 1)` if the image has not
  // been resized.
  uint32_t sizeInBytes; 

  // When 16bit image is converted to 8 bit (for instance if we want to
  // compress an image in jpeg, which is limited to 8bits). We unstretch the
  // image in the frontend so we can use similar windowing values in
  // cornerstone either when we use low quality image (jpeg 8 bits) or lossless
  // (8-16bits).
  bool stretched;
  // When we stretch an image dynamic from 16bits to 8bits, we only stretch the
  // useful bits (so we avoid losing a lot of quality for instance if the raw
  // image is in 16bits but only use 10 of those). The following values allow
  // to unstretch the image back to the right value in the frontend.
  int32_t minPixelValue;
  int32_t maxPixelValue;

  // This parameter is set to true, when the photometric interpretation is
  // MONOCHROME1. The `Monochrome1InversionPolicy` is therefore effective if
  // applied. Note it is actually only used for VSOL as for now, since we do
  // the color inversion in the frontend for the webviewer because it brings
  // the possibility to bypass decompression of compressed image in the
  // backend (which would need to do if we wanted to revert colors). Thus, it's
  // more optimize to do this in the frontend for already compressed images.
  // This parameter is not transmitted to the frontend.
  bool inverted;
};
