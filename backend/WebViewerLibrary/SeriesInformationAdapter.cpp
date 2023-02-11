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


#include "SeriesInformationAdapter.h"

#include "ViewerToolbox.h"

#include <boost/regex.hpp>

#include "Series/SeriesHelpers.h"

namespace OrthancPlugins
{
  bool SeriesInformationAdapter::Create(std::string& content,
                                        const std::string& seriesId)
  {
    std::string message = "Ordering instances of series: " + seriesId;
    OrthancPluginLogInfo(context_, message.c_str());

    Json::Value series, study, patient;
    if (!GetJsonFromOrthanc(series, context_, "/series/" + seriesId) ||
        !GetJsonFromOrthanc(study, context_, "/studies/" + series["ID"].asString() + "/module?simplify") ||
        !GetJsonFromOrthanc(patient, context_, "/studies/" + series["ID"].asString() + "/module-patient?simplify") ||
        !series.isMember("Instances") ||
        series["Instances"].type() != Json::arrayValue)
    {
      return false;
    }

    Json::Value result;
    result["ID"] = seriesId;
    result["SeriesDescription"] = series["MainDicomTags"]["SeriesDescription"].asString();
    result["StudyDescription"] = study["StudyDescription"].asString();
    result["PatientID"] = patient["PatientID"].asString();
    result["PatientName"] = patient["PatientName"].asString();
    result["Slices"] = Json::arrayValue;

    Json::Value sortedSlicesShort;
    SeriesHelpers::GetOrderedSeries(context_, sortedSlicesShort, seriesId);

    for (Json::Value::ArrayIndex i = 0; i < sortedSlicesShort.size(); i++)
    {
      std::string slice = sortedSlicesShort[i][0].asString() + "/" + boost::lexical_cast<std::string>(sortedSlicesShort[i][1].asUInt());
      result["Slices"].append(slice);
    }

    content = result.toStyledString();

    return true;
  }
}
