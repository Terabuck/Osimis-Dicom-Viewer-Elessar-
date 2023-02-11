#include "InstanceRepository.h"

#include <memory>
#include <string>
#include <json/value.h>
#include <Core/OrthancException.h>
#include <Core/DicomFormat/DicomMap.h> // To retrieve transfer syntax
#include <Core/Toolbox.h> // For _getTransferSyntax -> Orthanc::Toolbox::StripSpaces

#include "../OrthancContextManager.h"
#include "../BenchmarkHelper.h"
#include "../Image/AvailableQuality/OnTheFlyDownloadAvailableQualityPolicy.h"
#include "../Image/Utilities/ScopedBuffers.h" // for ScopedOrthancPluginMemoryBuffer
#include "ViewerToolbox.h"

std::string instanceMetadataId = "9998";
int instanceInfoJsonVersion = 3; // 2 -> 3: Added PatientSex in instances

InstanceRepository::InstanceRepository(OrthancPluginContext* context)
  : _context(context),
    _cachingInMetadataEnabled(false)
{
}

void InstanceRepository::EnableCachingInMetadata(bool enable) {
  _cachingInMetadataEnabled = enable;
}

void InstanceRepository::SignalNewInstance(const std::string& instanceId) {
  if (_cachingInMetadataEnabled) {
    Json::Value instanceInfo = GenerateInstanceInfo(instanceId);
    StoreInstanceInfoInMetadata(instanceId, instanceInfo);
  }
}



void InstanceRepository::StoreInstanceInfoInMetadata(const std::string& instanceId, const Json::Value& instanceInfo) {

  std::string url = "/instances/" + instanceId + "/metadata/" + instanceMetadataId;
  Json::FastWriter fastWriter;
  std::string instanceInfoContent = fastWriter.write(instanceInfo);
  ScopedOrthancPluginMemoryBuffer buffer(_context);

  // actually, we don't check the success or not, there's nothing to do anyway !
  OrthancPluginRestApiPutAfterPlugins(_context, buffer.getPtr(), url.c_str(), instanceInfoContent.c_str(), instanceInfoContent.size());
}

Json::Value InstanceRepository::GetInstanceInfo(const std::string& instanceId) {

  if (_cachingInMetadataEnabled) {
      Json::Value instanceInfo;

      // if information has not been cached yet (or is obsolete, update it)
      if (!OrthancPlugins::GetJsonFromOrthanc(instanceInfo, _context, "/instances/" + instanceId + "/metadata/" + instanceMetadataId)
          || instanceInfo["Version"] != instanceInfoJsonVersion)
      {
        instanceInfo = GenerateInstanceInfo(instanceId);
        StoreInstanceInfoInMetadata(instanceId, instanceInfo);
      }
      return SanitizeInstanceInfo(instanceInfo);  // the info that has been cached my contain inconsistent data -> re-sanitize it
  } else {
      return GenerateInstanceInfo(instanceId);
  }
}

Json::Value InstanceRepository::GenerateInstanceInfo(const std::string& instanceId) {

  Json::Value instanceTags;
  if (!OrthancPlugins::GetJsonFromOrthanc(instanceTags, _context, "/instances/" + instanceId + "/simplified-tags"))
  {
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_InexistentItem));
  }

  Json::Value instanceInfo;
  instanceInfo["TagsSubset"] = SimplifyInstanceTags(instanceTags);
  instanceInfo["Version"] = instanceInfoJsonVersion;

  Json::Value instanceOrthancInfo;
  if (!OrthancPlugins::GetJsonFromOrthanc(instanceOrthancInfo, _context, "/instances/" + instanceId))
  {
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_InexistentItem));
  }

  instanceInfo["SeriesId"] = instanceOrthancInfo["ParentSeries"];

  std::string transferSyntax;
  if (!OrthancPlugins::GetStringFromOrthanc(transferSyntax, _context, "/instances/" + instanceId + "/metadata/TransferSyntax")) {
    instanceInfo["TransferSyntax"] = Json::nullValue;
  } else {
    instanceInfo["TransferSyntax"] = transferSyntax;
  }

  return instanceInfo;
}

Json::Value InstanceRepository::SimplifyInstanceTags(const Json::Value& instanceTags) {

    // keep only the tags we need in the frontend -> otherwise, the full /series route might return 6MB of Json in case of a PET-CT !!!!
  Json::Value toReturn;

  std::vector<std::string> tagsToKeep;
  tagsToKeep.push_back("PatientName");
  tagsToKeep.push_back("PatientID");
  tagsToKeep.push_back("PatientBirthDate");
  tagsToKeep.push_back("PatientSex");
  tagsToKeep.push_back("PatientIdentityRemoved");
  tagsToKeep.push_back("OsimisNote");
  tagsToKeep.push_back("StudyDescription");
  tagsToKeep.push_back("StudyDate");
  tagsToKeep.push_back("StudyTime");
  tagsToKeep.push_back("SeriesDate");
  tagsToKeep.push_back("SeriesTime");
  tagsToKeep.push_back("SeriesNumber");
  tagsToKeep.push_back("SeriesDescription");

  // used by the JS code
  tagsToKeep.push_back("PatientOrientation");
  tagsToKeep.push_back("ImageLaterality");
  tagsToKeep.push_back("ViewPosition");
  tagsToKeep.push_back("MIMETypeOfEncapsulatedDocument");
  tagsToKeep.push_back("PhotometricInterpretation");
  tagsToKeep.push_back("PixelSpacing");
  tagsToKeep.push_back("ImagerPixelSpacing");
  tagsToKeep.push_back("SequenceOfUltrasoundRegions");
  tagsToKeep.push_back("PixelRepresentation");
  tagsToKeep.push_back("BitsStored");
  tagsToKeep.push_back("WindowCenter");
  tagsToKeep.push_back("WindowWidth");
  tagsToKeep.push_back("RescaleSlope");
  tagsToKeep.push_back("RescaleIntercept");
  tagsToKeep.push_back("RecommendedDisplayFrameRate");
  tagsToKeep.push_back("ImageOrientationPatient");
  tagsToKeep.push_back("ImagePositionPatient");
  tagsToKeep.push_back("SliceLocation");
  tagsToKeep.push_back("SliceThickness");
  tagsToKeep.push_back("FrameOfReferenceUID");
  tagsToKeep.push_back("HighBit");
  tagsToKeep.push_back("InstanceNumber");

  // used by the JS code in frontend/src/app/overlay/overlay.directive.js to display patient IDx - Ludwig
  tagsToKeep.push_back("PatientComments");

  // used by the C++ code
  tagsToKeep.push_back("Modality");
  tagsToKeep.push_back("Columns");
  tagsToKeep.push_back("Rows");


  for (std::vector<std::string>::const_iterator it = tagsToKeep.begin(); it != tagsToKeep.end(); it++)
  {
    if (!instanceTags[*it].empty())
    {
      toReturn[*it] = OrthancPlugins::SanitizeTag(*it, instanceTags[*it]);
    }
  }

  return toReturn;
}


Json::Value InstanceRepository::SanitizeInstanceInfo(const Json::Value& instanceInfo) {
  Json::Value sanitized = instanceInfo;
  sanitized["TagsSubset"]["Columns"] = OrthancPlugins::SanitizeTag("Columns", instanceInfo["TagsSubset"]["Columns"]);
  sanitized["TagsSubset"]["Rows"] = OrthancPlugins::SanitizeTag("Rows", instanceInfo["TagsSubset"]["Rows"]);

  return sanitized;
}
