#include "CacheContext.h"
#include "Series/SeriesRepository.h"
#include <Core/OrthancException.h>
#include <boost/foreach.hpp>

CacheContext::CacheContext(const std::string& path,
                           OrthancPluginContext* pluginContext,
                           bool debugLogsEnabled,
                           bool prefetchOnInstanceStored,
                           SeriesRepository* seriesRepository)
  : pluginContext_(pluginContext),
    storage_(path),
    seriesRepository_(seriesRepository),
    stop_(false),
    prefetchOnInstanceStored_(prefetchOnInstanceStored)
{
  boost::filesystem::path p(path);
  db_.Open((p / "cache.db").string());

  logger_.reset(new CacheLogger(pluginContext_, debugLogsEnabled));
  cacheManager_.reset(new OrthancPlugins::CacheManager(pluginContext_, db_, storage_));
  //cache_->SetSanityCheckEnabled(true);  // For debug

  scheduler_.reset(new OrthancPlugins::CacheScheduler(*cacheManager_, logger_.get(), 1000));

  newInstancesThread_ = boost::thread(NewInstancesThread, this);
}

CacheContext::~CacheContext()
{
  stop_ = true;
  if (newInstancesThread_.joinable())
  {
    newInstancesThread_.join();
  }

  scheduler_.reset(NULL);
  cacheManager_.reset(NULL);
}


void CacheContext::NewInstancesThread(CacheContext* that)
{
  while (!that->stop_)
  {
    try {
      std::auto_ptr<Orthanc::IDynamicObject> obj(that->newInstances_.Dequeue(100));
      if (obj.get() != NULL)
      {
        const std::string& instanceId = dynamic_cast<DynamicString&>(*obj).GetValue();

        // when receiving a new instance, this might actually be a new version of a previous instance
        // we have seen that with some Vet Fuji app where you can rework the instances (i.e: change the orientation)
        // and resend them to Orthanc -> cache was not cleared -> always invalidate the cache for a new instance
        // in case there's already something in the cache and the instance was deleted inbetween.
        that->logger_->LogCacheDebugInfo("newInstancesThread: invalidating instance " + instanceId);
        that->GetScheduler().Invalidate(OrthancPlugins::CacheBundle_DecodedImage, instanceId);

        // when receiving a new instance, we must also invalidate the parent series of the instance
        std::string uri = "/instances/" + std::string(instanceId);
        Json::Value instance;
        if (OrthancPlugins::GetJsonFromOrthanc(instance, that->pluginContext_, uri))
        {
          std::string seriesId = instance["ParentSeries"].asString();
          that->logger_->LogCacheDebugInfo("newInstancesThread: invalidating series " + seriesId);
          that->GetScheduler().Invalidate(OrthancPlugins::CacheBundle_SeriesInformation, seriesId);

          // also start pre-computing the images for the instance
          if (that->prefetchOnInstanceStored_)
          {
            try {
              std::auto_ptr<Series> series = that->seriesRepository_->GetSeries(seriesId);  // TODO: clarify difference between series cache and series repository (there's clearly a lot of redundancy there !)

              std::vector<ImageQuality::EImageQuality> qualitiesToPrefetch = series->GetOrderedImageQualities();
              BOOST_FOREACH(ImageQuality quality, qualitiesToPrefetch) {
                that->GetScheduler().Prefetch(OrthancPlugins::CacheBundle_DecodedImage, instanceId + "/0/" + quality.toProcessingPolicytString()); // TODO: for multi-frame images, we should prefetch all frames and not onlyt the first one !
              }
            } catch (Orthanc::OrthancException& ex) {
              OrthancPluginLogWarning(that->pluginContext_, (std::string("Exception while trying to prefetch instances: ") + ex.What()).c_str());
            } catch (...) {
              OrthancPluginLogError(that->pluginContext_, (std::string("Unexpected exception while trying to prefetch instances")).c_str());
            }
          }
        }
        that->logger_->LogCacheDebugInfo("newInstancesThread: done handling " + instanceId);
      }
    } catch (Orthanc::OrthancException& ex) {
      OrthancPluginLogWarning(that->pluginContext_, (std::string("Exception in newInstanceThread: ") + ex.What()).c_str());
    } catch (...) {
      OrthancPluginLogError(that->pluginContext_, (std::string("Unexpected exception in newInstanceThread")).c_str());
    }
  }
}

void CacheLogger::LogCacheDebugInfo(const std::string& message)
{
  if (debugLogsEnabled_)
  {
    OrthancPluginLogInfo(pluginContext_, (std::string("SHORT_TERM_CACHE: ") + message).c_str());
  }

}

