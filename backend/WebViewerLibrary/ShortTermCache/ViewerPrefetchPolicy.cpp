/**
 * Orthanc - A Lightweight, RESTful DICOM Store
 * Copyright (C) 2012-2016 Sebastien Jodogne, Medical Physics
 * Department, University Hospital of Liege, Belgium
 * Copyright (C) 2017 Osimis, Belgium
 *
 * This program is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 **/


#include "ViewerPrefetchPolicy.h"

#include "ViewerToolbox.h"
#include "CacheScheduler.h"

#include <json/value.h>
#include <json/reader.h>
#include "Image/ImageController.h"
#include <algorithm>
#include "Series/SeriesRepository.h"

static const Json::Value::ArrayIndex PREFETCH_FORWARD = 10;
static const Json::Value::ArrayIndex PREFETCH_BACKWARD = 3;


namespace OrthancPlugins
{

  void ViewerPrefetchPolicy::PrefetchSeries(std::list<CacheIndex>& toPrefetch,
                                            const std::string& seriesContent,
                                            unsigned int startIndex,
                                            unsigned int endIndex)
  {
    Json::Value json;
    Json::Reader reader;
    if (!reader.parse(seriesContent, json) ||
        !json.isMember("Slices"))
    {
      return;
    }

    const Json::Value& slices = json["Slices"];
    if (slices.type() != Json::arrayValue)
    {
      return;
    }

    // preload the first frames of the series in all available qualities
    std::auto_ptr<Series> series = seriesRepository_->GetSeries(json["ID"].asString(), false);

    BOOST_FOREACH(ImageQuality quality, series->GetOrderedImageQualities()) {

      for (Json::Value::ArrayIndex i = std::max(0u, startIndex);
           i < std::min(slices.size(), endIndex);
           i++)
      {
        toPrefetch.push_back(CacheIndex(CacheBundle_DecodedImage, slices[i].asString() + "/" + quality.toProcessingPolicytString()));
      }
    }
  }


  void ViewerPrefetchPolicy::ApplySeries(std::list<CacheIndex>& toPrefetch,
                                         CacheScheduler& cache,
                                         const std::string& series,
                                         const std::string& content)
  {
    PrefetchSeries(toPrefetch, content, 0, PREFETCH_FORWARD);
  }


  void ViewerPrefetchPolicy::ApplyInstance(std::list<CacheIndex>& toPrefetch,
                                           CacheScheduler& cache,
                                           const std::string& path)
  {
    std::string instanceId;
    uint32_t frameIndex;
    std::auto_ptr<IImageProcessingPolicy> processingPolicy;

    ImageControllerUrlParser::parseUrlPostfix(path, instanceId, frameIndex, processingPolicy);
    std::string slice = instanceId + "/" + boost::lexical_cast<std::string>(frameIndex);

    // get the instance information
    Json::Value instanceJson;
    if (!GetJsonFromOrthanc(instanceJson, context_, "/instances/" + instanceId) ||
        !instanceJson.isMember("ParentSeries"))
    {
      return;
    }

    // request the prefetch of all higher qualities in their order of quality
    std::auto_ptr<Series> series = seriesRepository_->GetSeries(instanceJson["ParentSeries"].asString(), false);
    // if the current quality is low, start to prefetch the higher quality:
    std::string currentQuality = processingPolicy->ToString();

    BOOST_FOREACH(ImageQuality quality, series->GetOrderedImageQualities(ImageQuality::fromProcessingPolicytString(currentQuality))) {
      toPrefetch.push_back(CacheIndex(CacheBundle_DecodedImage, slice + "/" + quality.toProcessingPolicytString()));
    }


    // get the series information
    std::string seriesContent;
    if (!cache.Access(seriesContent, CacheBundle_SeriesInformation, instanceJson["ParentSeries"].asString()))
    {
      return;
    }

    // find the index of this frame in the series
    Json::Value json;
    Json::Reader reader;
    if (!reader.parse(seriesContent, json) ||
        !json.isMember("Slices"))
    {
      return;
    }

    const Json::Value& slices = json["Slices"];
    if (slices.type() != Json::arrayValue)
      return;

    Json::Value::ArrayIndex position = 0;
    while (position < slices.size())
    {
      if (slices[position] == slice)
        break;

      position++;
    }



    PrefetchSeries(toPrefetch, seriesContent, position - PREFETCH_BACKWARD, position + PREFETCH_FORWARD);

    //    Json::Value series;
    //    Json::Reader reader;
    //    if (!reader.parse(tmp, series) ||
    //        !series.isMember("Slices"))
    //    {
    //      return;
    //    }

    //    const Json::Value& instances = series["Slices"];

    //    if (instances.type() != Json::arrayValue)
    //    {
    //      return;
    //    }

    //    Json::Value::ArrayIndex position = 0;
    //    while (position < instances.size())
    //    {
    //      if (instances[position] == instanceAndFrame)
    //      {
    //        break;
    //      }

    //      position++;
    //    }

    //    if (position == instances.size())
    //    {
    //      return;
    //    }

    //    for (Json::Value::ArrayIndex i = position;
    //         i < instances.size() && i < position + PREFETCH_FORWARD;
    //         i++)
    //    {
    //      std::string item = compression + instances[i].asString();
    //      toPrefetch.push_back(CacheIndex(CacheBundle_DecodedImage, item));
    //    }

    //    for (Json::Value::ArrayIndex i = position;
    //         i >= 0 && i > position - PREFETCH_BACKWARD; )
    //    {
    //      i--;
    //      std::string item = compression + instances[i].asString();
    //      toPrefetch.push_back(CacheIndex(CacheBundle_DecodedImage, item));
    //    }
  }


  void ViewerPrefetchPolicy::Apply(std::list<CacheIndex>& toPrefetch,
                                   CacheScheduler& cache,
                                   const CacheIndex& accessed,
                                   const std::string& content)
  {
    switch (accessed.GetBundle())
    {
    case CacheBundle_SeriesInformation:
      ApplySeries(toPrefetch, cache, accessed.GetItem(), content);
      return;

    case CacheBundle_DecodedImage:
      ApplyInstance(toPrefetch, cache, accessed.GetItem());
      return;

    default:
      return;
    }
  }
}

