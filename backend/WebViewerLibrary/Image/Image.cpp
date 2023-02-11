#include "Image.h"

Image::Image(const std::string& instanceId, uint32_t frameIndex, std::auto_ptr<RawImageContainer> data, const Json::Value& dicomTags)
  : metaData_(data.get(), dicomTags), data_(data)
{
  instanceId_ = instanceId;
  frameIndex_ = frameIndex;
  assert(data_.get() != NULL);
}

Image::Image(const std::string& instanceId, uint32_t frameIndex, std::auto_ptr<IImageContainer> data, const Orthanc::DicomMap& headerTags, const Json::Value& dicomTags)
  : metaData_(headerTags, dicomTags), data_(data)
{
  instanceId_ = instanceId;
  frameIndex_ = frameIndex;
  assert(data_.get() != NULL);
}

Image::Image(const std::string& instanceId, uint32_t frameIndex, std::auto_ptr<CornerstoneKLVContainer> data)
  : metaData_(), data_(data)
{
  // @todo @warning metaData_ aren't consistent !
  // fetch them from data with struct definition ? direct copy ?
  instanceId_ = instanceId;
  frameIndex_ = frameIndex;
  assert(data_.get() != NULL);
}

void Image::ApplyProcessing(IImageProcessingPolicy* policy)
{
  std::auto_ptr<IImageContainer> input = data_;
  std::auto_ptr<IImageContainer> output = policy->Apply(input, &metaData_);

  // Either input memory has been released or input is used as output
  assert(input.get() == NULL);
  assert(output.get() != NULL);

  data_ = output;
}
