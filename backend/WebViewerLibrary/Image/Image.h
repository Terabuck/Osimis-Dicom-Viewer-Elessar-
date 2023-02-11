#pragma once

#include <string>
#include <json/writer.h> // for Json::Value

#include <Core/DicomFormat/DicomMap.h>
#include "../OrthancContextManager.h"
#include "ImageContainer/IImageContainer.h"
#include "ImageContainer/RawImageContainer.h"
#include "ImageContainer/CornerstoneKLVContainer.h"
#include "ImageProcessingPolicy/IImageProcessingPolicy.h"
#include "ImageMetaData.h"

/** Image [@RootAggregate]
 *
 * Either
 * - a frame (for multiframe instance) or
 * - an instance (for monoframe instance)
 *
 */
class Image : public boost::noncopyable {
  friend class ImageRepository;

public:
  inline std::string GetId() const;
  inline const char* GetBinary() const;
  inline uint32_t GetBinarySize() const;

private:
  // instantiation is done by ImageRepository

  // takes memory ownership
  // This constructor is called when the image object is created from an
  // uncompressed image. We thus have direct access to the raw pixel.
  // @deprecated since we should only do pixel-based computations on the
  //     frontend since we can't always rely on them.
  Image(const std::string& instanceId, uint32_t frameIndex, std::auto_ptr<RawImageContainer> data, const Json::Value& dicomTags);

  // takes memory ownership
  // This constructor is called when the image object is created from a
  // compressed image embedded within the dicom file. We use it for performance
  // optimisation (so we don't have to decompress the whole image and then
  // recompress it).
  Image(const std::string& instanceId, uint32_t frameIndex, std::auto_ptr<IImageContainer> data, const Orthanc::DicomMap& headerTags, const Json::Value& dicomTags);

  // takes memory ownership
  // This constructor is called when the image object is created from a cached
  // klv image (available in attachment).
  Image(const std::string& instanceId, uint32_t frameIndex, std::auto_ptr<CornerstoneKLVContainer> data);

  void ApplyProcessing(IImageProcessingPolicy* policy);

private:
  std::string instanceId_;
  uint32_t frameIndex_;
  ImageMetaData metaData_; // should always be defined prior to 'data_' due to constructor initialization order
  std::auto_ptr<IImageContainer> data_;
};

inline std::string Image::GetId() const {
  return instanceId_;
}
inline const char* Image::GetBinary() const {
  return data_->GetBinary();
}
inline uint32_t Image::GetBinarySize() const {
  return data_->GetBinarySize();
}
