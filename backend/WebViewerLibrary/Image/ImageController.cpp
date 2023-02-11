#include "ImageController.h"

#include <iostream>
#include <string>

#include <boost/regex.hpp>
#include <boost/foreach.hpp>
#include <boost/lexical_cast.hpp> // to retrieve exception error code for log + parse routes
#include <boost/algorithm/string.hpp> // for boost::algorithm::split & boost::starts_with

#include <json/json.h>
#include <json/reader.h>
#include <json/writer.h>
#include <json/value.h>

#include <Core/OrthancException.h> // for OrthancException(UnknownResource) catch

#include "../BenchmarkHelper.h" // for BENCH(*)
#include "ImageProcessingPolicy/LowQualityPolicy.h"
#include "ImageProcessingPolicy/MediumQualityPolicy.h"
#include "ImageProcessingPolicy/HighQualityPolicy.h"
#include "ImageProcessingPolicy/PixelDataQualityPolicy.h"

#include "ImageProcessingPolicy/CompositePolicy.h"
#include "ImageProcessingPolicy/ResizePolicy.h"
#include "ImageProcessingPolicy/JpegConversionPolicy.h"
#include "ImageProcessingPolicy/PngConversionPolicy.h"
#include "ImageProcessingPolicy/Uint8ConversionPolicy.h"
#include "ImageProcessingPolicy/KLVEmbeddingPolicy.h"
#include "ImageProcessingPolicy/Monochrome1InversionPolicy.h"
#include "ShortTermCache/CacheContext.h"

ImageRepository* ImageController::imageRepository_ = NULL;
CacheContext* ImageController::cacheContext_ = NULL;
AnnotationRepository* ImageController::annotationRepository_ = NULL;

template<>
void ImageController::Inject<ImageRepository>(ImageRepository* obj) {
  ImageController::imageRepository_ = obj;
}
template<>
void ImageController::Inject<CacheContext>(CacheContext* obj) {
  ImageController::cacheContext_ = obj;
}
template<>
void ImageController::Inject<AnnotationRepository>(AnnotationRepository* obj) {
  ImageController::annotationRepository_ = obj;
}

ImageController::ImageController(OrthancPluginRestOutput* response, const std::string& url, const OrthancPluginHttpRequest* request)
  : BaseController(response, url, request)
{
  ImageControllerUrlParser::init();  // create imageProcessingRouteParser_ if not created yet (it's used by 2 classes but we don't know which one will use it first)
}

int ImageController::_ParseURLPostFix(const std::string& urlPostfix) {
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();
  urlPostfix_ = urlPostfix;
  
  try {
    BENCH(URL_PARSING);
    // /osimis-viewer/images/<instance_uid:str>/<frame_index:int>/{low|medium|high|pixeldata}-quality
    // /osimis-viewer/images/<instance_uid:str>/<frame_index:int>/annotations
    boost::regex regexp("^(nocache/|cleancache/)?([^/]+)/(\\d+)(?:/(.+))$");

    boost::cmatch matches;
    if (!boost::regex_match(urlPostfix.c_str(), matches, regexp)) {
      // Log bad regex match.
      std::string message("(ImageController) unmatched regex for ");
      message += urlPostfix;
      OrthancPluginLogInfo(context, message.c_str());

      // Return 404 error on badly formatted URL - @todo use ErrorCode_UriSyntax instead
      return this->_AnswerError(404);
    }
    else {
      this->disableCache_ = (std::string(matches[1]) == "nocache/");
      this->cleanCache_ = (std::string(matches[1]) == "cleancache/");
      this->instanceId_ = matches[2];
      this->frameIndex_ = boost::lexical_cast<uint32_t>(matches[3]);

      // Return 404 error if no subroute has been set.
      if (matches.size() < 4) {
        return this->_AnswerError(404);
      }
      // If subroute is an annotation, preprocess the request as such.
      else if (boost::starts_with(matches[4], "annotations")) {
        this->isAnnotationRequest_ = true;
        // See the _ProcessRequest method for request processing.
      }
      // If subroute is an image processing route, preprocess the request as
      // such.
      else {
        this->isAnnotationRequest_ = false;
        this->processingPolicy_.reset(matches.size() < 4 ? NULL : ImageControllerUrlParser::InstantiatePolicyFromRoute(matches[4]));
        // See the _ProcessRequest method for request processing.
      }
      

      BENCH_LOG(INSTANCE, instanceId_);
      BENCH_LOG(FRAME_INDEX, frameIndex_);
    }

    return 200;
  }
  catch (const std::invalid_argument& exc) {
    // Log invalid_argument (probably because processingPolicy has not been
    // found).
    std::string message("(ImageController) std::invalid_argument during URL parsing ");
    message += "(processing policy not found?)";
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    // Return 404 instead of 500 (it's most likely a not-found issue).
    return this->_AnswerError(404);
  }
  catch (const boost::bad_lexical_cast& exc) {
    // Log bad lexical cast (should have been prevented by the regex).
    std::string message("(ImageController) boost::bad_lexical_cast during URL parsing ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const Orthanc::OrthancException& exc) {
    // Log detailed Orthanc error.
    std::string message("(ImageController) Orthanc::OrthancException during URL parsing ");
    message += boost::lexical_cast<std::string>(exc.GetErrorCode());
    message += "/";
    message += boost::lexical_cast<std::string>(exc.GetHttpStatus());
    message += " ";
    message += exc.What();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(exc.GetHttpStatus());
  }
  catch (const std::exception& exc) {
    // Log detailed std error.
    std::string message("(ImageController) std::exception during URL parsing ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(ImageController) std::string during URL parsing ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(ImageController) Unknown Exception during URL parsing");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}

int ImageController::_ProcessRequest()
{
  // Retrieve context so we can use orthanc's logger.
  OrthancPluginContext* context = OrthancContextManager::Get();

  try {
    BENCH(FULL_PROCESS);

    // Treat annotation requests
    if (this->isAnnotationRequest_) {
      // Answer 404 if method is not PUT, as the only request method accepted
      // for this route is PUT.
      if (this->request_->method != OrthancPluginHttpMethod_Put) {
        return this->_AnswerError(404);
      }
      // Answer 403 Forbidden if annotation storage is disabled
      else if (!this->annotationRepository_->isAnnotationStorageEnabled()) {
        return this->_AnswerError(403);
      }
      // Process `/images/<instance>/<frame>/annotations` PUT request
      else {
        // Parse PUT request's json body.
        std::string requestBody(this->request_->body, this->request_->bodySize);
        Json::Value value;
        Json::Reader reader;
        if (!reader.parse(requestBody.c_str(), value)) {
          std::string message("(ImageController) Failed to parse annotation request's json body.");
          OrthancPluginLogInfo(context, message.c_str());
          
          return this->_AnswerError(400);
        }

        // Retrieve the value of the `annotationsByTool` key.
        value = value["annotationsByTool"];

        // Store annotation in db.
        annotationRepository_->setByImageId(this->instanceId_, this->frameIndex_, value);

        // Answer request.
        std::string answer = "{\"success\": true}";
        return this->_AnswerBuffer(answer, "application/json");
      }
    }
    // Treat image processing requests
    else {
      // clean cache
      if (cleanCache_) {
        imageRepository_->CleanImageCache(this->instanceId_, this->frameIndex_, this->processingPolicy_.get());
        std::string answer = "{}";
        return this->_AnswerBuffer(answer, "application/json");
      }

      // all routes point to a processing policy, check there is one
      assert(this->processingPolicy_.get() != NULL);

      if (cacheContext_ != NULL)  //if there is a cache enabled
      {
        std::string content;
        if (cacheContext_->GetScheduler().Access(content, CacheBundle_DecodedImage, this->urlPostfix_))
        {
          BENCH(REQUEST_ANSWERING);

          return this->_AnswerBuffer(content.c_str(), content.size(), "application/octet-stream");
        }
        else
        {
          return this->_AnswerError(500);
        }
      }
      else // no cache enabled
      {
        // retrieve processed image
        std::auto_ptr<Image> image = imageRepository_->GetImage(this->instanceId_, this->frameIndex_, this->processingPolicy_.get(), !this->disableCache_);

        if (image.get() != NULL)
        {
          BENCH(REQUEST_ANSWERING);

          // Answer rest request
          return this->_AnswerBuffer(image->GetBinary(), image->GetBinarySize(), "application/octet-stream");
        }
        else
        {
          // Answer Internal Error
          return this->_AnswerError(500);
        }
      }
    }
  }
  // @note if the exception has been thrown from some constructor,
  // memory leaks may happen. we should fix the bug instead of focusing on those memory leaks.
  // however, in case of memory leak due to bad alloc, we should clean memory.
  // @todo avoid memory allocation within constructor
  catch (const Orthanc::OrthancException& exc) {
    // Log detailed Orthanc error.
    std::string message("(ImageController) Orthanc::OrthancException ");
    message += boost::lexical_cast<std::string>(exc.GetErrorCode());
    message += "/";
    message += boost::lexical_cast<std::string>(exc.GetHttpStatus());
    message += " ";
    message += exc.What();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(exc.GetHttpStatus());
  }
  catch (const std::exception& exc) {
    // Log detailed std error.
    std::string message("(ImageController) std::exception ");
    message += exc.what();
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (const std::string& exc) {
    // Log string error (shouldn't happen).
    std::string message("(ImageController) std::string ");
    message += exc;
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
  catch (...) {
    // Log unknown error (shouldn't happen).
    std::string message("(ImageController) Unknown Exception");
    OrthancPluginLogError(context, message.c_str());

    return this->_AnswerError(500);
  }
}

// Parse JpegConversionPolicy compression parameter from its route regex matches
// may throws lexical_cast on bad route
template<>
inline JpegConversionPolicy* ImageProcessingRouteParser::_Instantiate<JpegConversionPolicy>(boost::cmatch& regexpMatches)
{
  int compression = 100;
  
  if (regexpMatches[1].length()) {
    compression = boost::lexical_cast<int>(regexpMatches[1]);
  }

  return new JpegConversionPolicy(compression);
};

// Parse ResizePolicy compression parameter from its route regex matches
// may throws lexical_cast on bad route
template<>
inline ResizePolicy* ImageProcessingRouteParser::_Instantiate<ResizePolicy>(boost::cmatch& regexpMatches)
{
  unsigned int maxWidthHeight = 0;
  
  if (regexpMatches[1].length()) {
    maxWidthHeight = boost::lexical_cast<unsigned int>(regexpMatches[1]);
  }

  return new ResizePolicy(maxWidthHeight);
};

// Parse a route containing multiple policies into a single CompositePolicy
template<>
inline CompositePolicy* ImageProcessingRouteParser::_Instantiate<CompositePolicy>(boost::cmatch& regexpMatches)
{
  ImageProcessingRouteParser imageProcessingRouteParser;
  imageProcessingRouteParser.RegisterRoute<ResizePolicy>("^resize:(\\d+)$"); // resize:<maximal height/width: uint>
  imageProcessingRouteParser.RegisterRoute<JpegConversionPolicy>("^jpeg:?(\\d{0,3})$");
  imageProcessingRouteParser.RegisterRoute<PngConversionPolicy>("^png$");
  imageProcessingRouteParser.RegisterRoute<Uint8ConversionPolicy>("^8bit$");
  imageProcessingRouteParser.RegisterRoute<KLVEmbeddingPolicy>("^klv$");
  imageProcessingRouteParser.RegisterRoute<Monochrome1InversionPolicy>("^invert-monochrome1$");

  CompositePolicy* compositePolicy = new CompositePolicy();

  std::string policiesStr(regexpMatches[1]);
  std::vector<std::string> policiesStrs;
  boost::algorithm::split(policiesStrs, policiesStr, boost::is_any_of("/"));

  BOOST_FOREACH(const std::string& policyStr, policiesStrs)
  {
    IImageProcessingPolicy* policy = imageProcessingRouteParser.InstantiatePolicyFromRoute(policyStr);
    compositePolicy->AddPolicy(policy);
  }

  return compositePolicy;
};

ImageControllerCacheFactory::ImageControllerCacheFactory(ImageRepository* imageRepository) :
  imageRepository_(imageRepository)
{
}



bool ImageControllerCacheFactory::Create(std::string& content,
                                         const std::string& uri)
{
  std::string instanceId;
  uint32_t frameIndex;
  std::auto_ptr<IImageProcessingPolicy> processingPolicy;

  if (!ImageControllerUrlParser::parseUrlPostfix(uri, instanceId, frameIndex, processingPolicy))
  {
    OrthancPluginContext* context = OrthancContextManager::Get();
    std::string message("(ImageController) unmatched regex for ");
    message += uri;
    OrthancPluginLogInfo(context, message.c_str());
    return false;
  }

  // retrieve processed image
  std::auto_ptr<Image> image = imageRepository_->GetImage(instanceId, frameIndex, processingPolicy.get(), false);

  //transform the image to a string that can be stored in cache
  content = std::string(image->GetBinary(), image->GetBinarySize());
  return true;
}

void ImageControllerCacheFactory::Invalidate(const std::string& item)
{
  this->imageRepository_->invalidateInstance(item);
}

std::auto_ptr<ImageProcessingRouteParser> ImageControllerUrlParser::imageProcessingRouteParser_;

void ImageControllerUrlParser::init()
{
  if (imageProcessingRouteParser_.get() == NULL)
  {
    imageProcessingRouteParser_.reset(new ImageProcessingRouteParser());
    imageProcessingRouteParser_->RegisterRoute<LowQualityPolicy>("^low-quality$");
    imageProcessingRouteParser_->RegisterRoute<MediumQualityPolicy>("^medium-quality$");
    imageProcessingRouteParser_->RegisterRoute<HighQualityPolicy>("^high-quality$");
    imageProcessingRouteParser_->RegisterRoute<PixelDataQualityPolicy>("^pixeldata-quality$");

    imageProcessingRouteParser_->RegisterRoute<CompositePolicy>("^(.+/.+)$"); // regex: at least a single "/"
    imageProcessingRouteParser_->RegisterRoute<ResizePolicy>("^resize:(\\d+)$"); // resize:<maximal height/width: uint>
    imageProcessingRouteParser_->RegisterRoute<JpegConversionPolicy>("^jpeg:?(\\d{0,3})$"); // regex: jpeg:<quality level: int[0;100]>
    imageProcessingRouteParser_->RegisterRoute<PngConversionPolicy>("^png$");
    imageProcessingRouteParser_->RegisterRoute<Uint8ConversionPolicy>("^8bit$");
    imageProcessingRouteParser_->RegisterRoute<KLVEmbeddingPolicy>("^klv$");
    imageProcessingRouteParser_->RegisterRoute<Monochrome1InversionPolicy>("^invert-monochrome1$");
  }
}

bool ImageControllerUrlParser::parseUrlPostfix(const std::string urlPostfix, std::string& instanceId, uint32_t& frameIndex, std::auto_ptr<IImageProcessingPolicy>& processingPolicy)
{
  init(); // create imageProcessingRouteParser_ if not created yet  (it's used by 2 classes but we don't know which one will use it first)

  boost::regex regexp("^(nocache/|cleancache/)?([^/]+)/(\\d+)(?:/(.+))$");
  boost::cmatch matches;
  if (!boost::regex_match(urlPostfix.c_str(), matches, regexp)) {
    return false;
  }

  instanceId = matches[2];
  frameIndex = boost::lexical_cast<uint32_t>(matches[3]);

  if (matches.size() < 4)
    return false;

  processingPolicy.reset(matches.size() < 4 ? NULL : imageProcessingRouteParser_->InstantiatePolicyFromRoute(matches[4]));
  return true;
}
