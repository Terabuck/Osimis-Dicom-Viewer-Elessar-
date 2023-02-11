#pragma once

#include <orthanc/OrthancCPlugin.h>
#include <json/value.h>

class SeriesHelpers
{
public:
  static void GetOrderedSeries(OrthancPluginContext* context, Json::Value& orderedSlicesShort, const std::string& seriesId);
};
