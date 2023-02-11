#ifndef IMAGE_REPOSITORY_H
#define IMAGE_REPOSITORY_H

#include <string>
#include <boost/thread/mutex.hpp>
#include <orthanc/OrthancCPlugin.h>

#include "../Instance/DicomRepository.h"
#include "Image.h"

class CacheContext;

/** ImageRepository [@Repository]
 *
 * Retrieve an Image from an instance uid and a frame index.
 *
 * @Responsibility Handle all the I/O operations related to Images
 *
 * @Responsibility Manage cache
 *
 */
class ImageRepository : public boost::noncopyable {
public:
  ImageRepository(DicomRepository* dicomRepository, CacheContext* cache);

  // gives memory ownership
  std::auto_ptr<Image> GetImage(const std::string& instanceId, uint32_t frameIndex, IImageProcessingPolicy* policy, bool enableCache) const;
  void CleanImageCache(const std::string& instanceId, uint32_t frameIndex, IImageProcessingPolicy* policy) const;

  void invalidateInstance(const std::string& instanceId);
  void enableCachedImageStorage(bool enable) {_cachedImageStorageEnabled = enable;}
  bool isCachedImageStorageEnabled() const {return _cachedImageStorageEnabled;}

private:
   // _imageLoadingPolicy;

  DicomRepository* _dicomRepository;
  CacheContext* _shortTermCacheContext;
  bool _cachedImageStorageEnabled;
  mutable boost::mutex mutex_;

  std::auto_ptr<Image> _LoadImageFromOrthanc(const std::string& instanceId, uint32_t frameIndex, IImageProcessingPolicy* policy) const; // Factory method
  void _CacheProcessedImage(const std::string &attachmentNumber, const Image* image) const;
  std::auto_ptr<Image> _GetProcessedImageFromCache(const std::string &attachmentNumber, const std::string& instanceId, uint32_t frameIndex) const; // Return 0 when no cache found
};

#endif // IMAGE_REPOSITORY_H
