#ifndef IMAGE_ROUTE_H
#define IMAGE_ROUTE_H

#include <memory>
#include <string>

#include "../BaseController.h"
#include "../Annotation/AnnotationRepository.h"
#include "ImageRepository.h"
#include "Utilities/ImageProcessingRouteParser.h"
#include "ImageProcessingPolicy/IImageProcessingPolicy.h"
#include "ShortTermCache/ICacheFactory.h"

class ImageControllerCacheFactory;

// .../<instance_id>/<frame_index>/<compression_policy>
class ImageController : public BaseController, public boost::noncopyable {
public:
  ImageController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request);

  template<typename T>
  static void Inject(T* obj);

protected:
  virtual int _ParseURLPostFix(const std::string& urlPostfix);
  virtual int _ProcessRequest();

  bool _getResponseContent(const std::string& url);

private:
  static ImageRepository* imageRepository_;
  static AnnotationRepository* annotationRepository_;
  static CacheContext* cacheContext_;

  bool isAnnotationRequest_;
  bool disableCache_;
  bool cleanCache_;
  std::string instanceId_;
  uint32_t frameIndex_;
  std::string urlPostfix_;
  std::auto_ptr<IImageProcessingPolicy> processingPolicy_;

  friend class ImageControllerCacheFactory;
};

class ImageControllerUrlParser
{
  static std::auto_ptr<ImageProcessingRouteParser> imageProcessingRouteParser_;
public:
  static void init();
  static bool parseUrlPostfix(const std::string urlPostfix, std::string& instanceId, uint32_t& frameIndex, std::auto_ptr<IImageProcessingPolicy>& processingPolicy);
  static IImageProcessingPolicy* InstantiatePolicyFromRoute(const std::string& route)
  {
    assert(imageProcessingRouteParser_.get() != NULL);
    return imageProcessingRouteParser_->InstantiatePolicyFromRoute(route);
  }
};

class ImageControllerCacheFactory: public OrthancPlugins::ICacheFactory
{
  ImageRepository* imageRepository_;
  AnnotationRepository* annotationRepository_;

public:
  ImageControllerCacheFactory(ImageRepository* imageRepository);

  // WARNING: No mutual exclusion is enforced! Several threads could
  // call this method at the same time.
  virtual bool Create(std::string& content,
                      const std::string& uri);

  virtual void Invalidate(const std::string& item);

};

#endif // IMAGE_ROUTE_H
