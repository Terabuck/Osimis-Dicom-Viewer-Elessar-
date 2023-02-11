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


#pragma once

#include <string>
#include <set>
#include <json/value.h>
#include <Core/DicomFormat/DicomMap.h>
#include "../Image/AvailableQuality/ImageQuality.h"

class Series {
  friend class SeriesFactory;

public:
  std::vector<ImageQuality::EImageQuality> GetOrderedImageQualities(ImageQuality::EImageQuality higherThan = ImageQuality::NONE) const;
  static Series* FromJson(const Json::Value& seriesJson);
  void ToJson(Json::Value& output) const;

  std::string GetModality() const;
  std::string GetMiddleInstanceId() const;
private:
  // takes seriesTags memory ownership
  Series(const std::string& seriesId,
         const std::string& contentType,
         const Json::Value& seriesTags,
         const Json::Value& instancesInfos,
         const Json::Value& orderedInstances,
         const std::set<ImageQuality::EImageQuality>& imageQualities,
         const Json::Value& studyInfo);

  std::string _seriesId;
  std::string _contentType;
  Json::Value _seriesTags; // @warning Those are all the tags of the middle instance of the orthanc series!
  Json::Value _instancesInfos; // Infos from all instances
  Json::Value _orderedInstances;
  Json::Value _studyInfo;

  std::set<ImageQuality::EImageQuality> _imageQualities;

};
