#include "SeriesRepository.h"

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
#include "../Instance/InstanceRepository.h"
#include "ViewerToolbox.h"
#include "Series/SeriesHelpers.h"

std::string seriesMetadataId = "9997";
int seriesInfoJsonVersion = 2; // 1 -> 2: Added PatientSex in instances


namespace {
  std::string _getTransferSyntax(const Orthanc::DicomMap& headerTags);
  bool _isDicomSr(const Json::Value &tags);
  bool _isDicomSeg(const Json::Value &tags);
  bool _isDicomPr(const Json::Value &tags);
  Json::Value simplifyInstanceTags(const Json::Value& instanceTags);
}

SeriesRepository::SeriesRepository(OrthancPluginContext* context, DicomRepository* dicomRepository, InstanceRepository* instanceRepository)
  : _context(context),
    _dicomRepository(dicomRepository),
    _instanceRepository(instanceRepository),
    _seriesFactory(std::auto_ptr<IAvailableQualityPolicy>(new OnTheFlyDownloadAvailableQualityPolicy)),
    _cachingInMetadataEnabled(false)
{
}

void SeriesRepository::EnableCachingInMetadata(bool enable) {
  _cachingInMetadataEnabled = enable;
}

void SeriesRepository::StoreSeriesInfoInMetadata(const std::string& seriesId, const Series& series)
{
  std::string url = "/series/" + seriesId + "/metadata/" + seriesMetadataId;

  Json::Value seriesJson;
  series.ToJson(seriesJson);
  seriesJson["Version"] = seriesInfoJsonVersion;
  Json::FastWriter fastWriter;
  std::string infoContent = fastWriter.write(seriesJson);
  ScopedOrthancPluginMemoryBuffer buffer(_context);

  // actually, we don't check the success or not, there's nothing to do anyway !
  OrthancPluginRestApiPutAfterPlugins(_context, buffer.getPtr(), url.c_str(), infoContent.c_str(), infoContent.size());

}

std::auto_ptr<Series> SeriesRepository::GetSeries(const std::string& seriesId, bool getInstanceTags)
{
  if (_cachingInMetadataEnabled && getInstanceTags)
  {
    Json::Value seriesInfo;
    if (!OrthancPlugins::GetJsonFromOrthanc(seriesInfo, _context, "/series/" + seriesId))
    {
      throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_InexistentItem));
    }

    Json::Value seriesCachedInfo;

    // if information has not been cached yet (or is obsolete, update it)
    if (!OrthancPlugins::GetJsonFromOrthanc(seriesCachedInfo, _context, "/series/" + seriesId + "/metadata/" + seriesMetadataId)
        || seriesCachedInfo["Version"] != seriesInfoJsonVersion
        || seriesCachedInfo["instancesInfos"].size() != seriesInfo["Instances"].size())  // new instances have been added
    {
      std::auto_ptr<Series> output = GenerateSeriesInfo(seriesId, getInstanceTags);
      StoreSeriesInfoInMetadata(seriesId, *output);
      return output;
    } else {
      return std::auto_ptr<Series>(Series::FromJson(seriesCachedInfo));
    }
  } else {
    return GenerateSeriesInfo(seriesId, getInstanceTags);
  }
}



std::auto_ptr<Series> SeriesRepository::GenerateSeriesInfo(const std::string& seriesId, bool getInstanceTags)
{
  Json::Value sortedSlicesShort;

  SeriesHelpers::GetOrderedSeries(_context, sortedSlicesShort, seriesId);

  Json::Value instancesInfos;

  // Retrieve middle instance id
  std::string middleInstanceId;

  middleInstanceId = sortedSlicesShort[sortedSlicesShort.size() / 2][0].asString();

  if (getInstanceTags)
  {
    BENCH(RETRIEVE_ALL_INSTANCES_TAGS)
    for(Json::ValueIterator itr = sortedSlicesShort.begin(); itr != sortedSlicesShort.end(); itr++) {
      std::string instanceId = (*itr)[0].asString();

      instancesInfos[instanceId] = _instanceRepository->GetInstanceInfo(instanceId);
    }
  }
  else
  {// only get the middle instance tags
    instancesInfos[middleInstanceId] = _instanceRepository->GetInstanceInfo(middleInstanceId);
  }

  // Get middle instance's dicom file
  OrthancPluginMemoryBuffer dicom; // no need to free - memory managed by dicomRepository
  _dicomRepository->getDicomFile(middleInstanceId, dicom);

  // Clean middle instance's dicom file (at scope end)
  DicomRepository::ScopedDecref autoDecref(_dicomRepository, middleInstanceId);

  // Get middle instance's tags (the DICOM meta-informations)
  Orthanc::DicomMap dicomMapToFillTags1;
  Json::Value tags1;
  if (!Orthanc::DicomMap::ParseDicomMetaInformation(dicomMapToFillTags1, reinterpret_cast<const char*>(dicom.data), dicom.size))
  {
    // Consider implicit VR if `ParseDicomMetaInformation` has failed (it fails
    // because `DICM` header at [128..131] is not present in the DICOM instance  
    // binary file). In our tests, while being visible in some other viewers,
    // those files didn't have any TransferSyntax either.
    tags1["TransferSyntax"] = "1.2.840.10008.1.2";
  }
  else {
    tags1["TransferSyntax"] = _getTransferSyntax(dicomMapToFillTags1);
  }

  // Get middle instance's tags (the other tags)
  const Json::Value& middleInstanceInfos = instancesInfos[middleInstanceId];

  // Ignore DICOM SR (DICOM report) and PR (DICOM Presentation State, which are
  // `views` referencing other instances) files (they can't be processed by our
  // SeriesFactory) Note this line is only here to provide better error
  // message, also
  // @warning We make the assumption DICOM SR & PR are always a single alone
  //          instance contained within a separate series.
  std::string modality = middleInstanceInfos["TagsSubset"]["Modality"].asString();
  if (modality == "SR" || modality == "PR" || modality == "SEG") {
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_IncompatibleImageFormat), "unsupported modality: " + modality);
  }

  Json::Value studyInfo;
  if (!OrthancPlugins::GetJsonFromOrthanc(studyInfo, _context, "/series/" + seriesId + "/study"))
  {
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_InexistentItem));
  }

  // Create a series based on tags and ordered instances
  return std::auto_ptr<Series>(_seriesFactory.CreateSeries(seriesId, sortedSlicesShort, tags1, middleInstanceInfos, instancesInfos, studyInfo));
}

namespace {
  std::string _getTransferSyntax(const Orthanc::DicomMap& headerTags)
  {
    using namespace Orthanc;

    // Retrieve transfer syntax
    const DicomValue* transfertSyntaxValue = headerTags.TestAndGetValue(0x0002, 0x0010);
    std::string transferSyntax;

    if (transfertSyntaxValue->IsBinary()) {
      throw OrthancException(Orthanc::ErrorCode_CorruptedFile);
    }
    else if (transfertSyntaxValue == NULL || transfertSyntaxValue->IsNull()) {
      // Set default transfer syntax if not found
      transferSyntax = "1.2.840.10008.1.2";
    }
    else {
      // Stripping spaces should not be required, as this is a UI value
      // representation whose stripping is supported by the Orthanc
      // core, but let's be careful...
      transferSyntax = Orthanc::Toolbox::StripSpaces(transfertSyntaxValue->GetContent());
    }

    return transferSyntax;
  }

  bool _isDicomSr(const Json::Value &tags) {
    if (tags["Modality"].empty()) {
      return false;
    }

    std::string modality = tags["Modality"].asString();

    return (modality == "SR");
  }

  bool _isDicomSeg(const Json::Value &tags) {
    if (tags["Modality"].empty()) {
      return false;
    }

    std::string modality = tags["Modality"].asString();

    return (modality == "SEG");
  }

  bool _isDicomPr(const Json::Value &tags) {
    if (tags["Modality"].empty()) {
      return false;
    }

    std::string modality = tags["Modality"].asString();

    return (modality == "PR");
  }

  Json::Value simplifyInstanceTags(const Json::Value& instanceTags) {
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
}
