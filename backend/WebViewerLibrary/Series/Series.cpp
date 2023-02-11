/**
* Orthanc - A Lightweight, RESTful DICOM Store
* Copyright (C) 2012-2016 Sebastien Jodogne, Medical Physics
* Department, University Hospital of Liege, Belgium
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

#include "Series.h"

#include "ViewerToolbox.h"

#include <Core/OrthancException.h>
#include <boost/regex.hpp>
#include <boost/foreach.hpp>

Series::Series(const std::string& seriesId, const std::string& contentType, const Json::Value& seriesTags, const Json::Value& instancesInfos,
    const Json::Value& orderedInstances, const std::set<ImageQuality::EImageQuality>& imageQualities, const Json::Value& studyInfo)
    : _seriesId(seriesId), 
    _contentType(contentType), 
    _seriesTags(seriesTags), 
    _instancesInfos(instancesInfos), 
    _orderedInstances(orderedInstances), 
    _studyInfo(studyInfo),
    _imageQualities(imageQualities)
    
{

}

void Series::ToJson(Json::Value& output) const
{
  output["id"] = _seriesId;
  output["contentType"] = _contentType;
  output["middleInstanceInfos"] = _seriesTags;
  output["instancesInfos"] = _instancesInfos;
  output["instances"] = _orderedInstances;
  output["study"] = _studyInfo;

  BOOST_FOREACH(ImageQuality quality, _imageQualities)
  {
    output["availableQualities"].append(quality.toString());
  }

}

std::string Series::GetModality() const
{
  if (_seriesTags["TagsSubset"].isMember("Modality") && _seriesTags["TagsSubset"]["Modality"].isString())
    return _seriesTags["TagsSubset"]["Modality"].asString();
  else
    return std::string();
}

std::string Series::GetMiddleInstanceId() const
{
  if (_orderedInstances.size() > 0)
  {
    return _orderedInstances[_orderedInstances.size() / 2][0].asString();
  }
  else
    return std::string();
}

Series* Series::FromJson(const Json::Value& seriesJson)
{
  std::set<ImageQuality::EImageQuality> imageQualities;
//  Json::Value imageQualitiesJson =
  for (size_t i = 0; i < seriesJson["availableQualities"].size(); i++) {
    imageQualities.insert(ImageQuality::fromString(seriesJson["availableQualities"][(int)i].asString()));
  }
  return new Series(seriesJson["id"].asString(), seriesJson["contentType"].asString(), seriesJson["middleInstanceInfos"], seriesJson["instancesInfos"], seriesJson["instances"], imageQualities, seriesJson["study"]);
}

std::vector<ImageQuality::EImageQuality> Series::GetOrderedImageQualities(ImageQuality::EImageQuality higherThan) const
{
  std::vector<ImageQuality::EImageQuality> toReturn;

  if (_imageQualities.find(ImageQuality::LOW) != _imageQualities.end() && ImageQuality::LOW > higherThan)
    toReturn.push_back(ImageQuality::LOW);
  if (_imageQualities.find(ImageQuality::MEDIUM) != _imageQualities.end() && ImageQuality::MEDIUM > higherThan)
    toReturn.push_back(ImageQuality::MEDIUM);
  if (_imageQualities.find(ImageQuality::LOSSLESS) != _imageQualities.end() && ImageQuality::LOSSLESS > higherThan)
    toReturn.push_back(ImageQuality::LOSSLESS);
  if (_imageQualities.find(ImageQuality::PIXELDATA) != _imageQualities.end() && ImageQuality::PIXELDATA > higherThan)
    toReturn.push_back(ImageQuality::PIXELDATA);

  return toReturn;
}
