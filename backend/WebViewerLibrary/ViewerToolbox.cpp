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


#include "ViewerToolbox.h"

#include <Core/OrthancException.h>
#include <Core/Toolbox.h>
#include <Core/DicomFormat/DicomArray.h>

#include <string>
#include <json/reader.h>
#include <stdexcept>
#include <boost/lexical_cast.hpp>
#include <sys/stat.h>

namespace OrthancPlugins
{
  // Throws exception when tag is unknown
  std::string GetTagName(const Orthanc::DicomTag& tag)
  {
      using namespace Orthanc;

      if (tag == DicomTag(0x0002, 0x0010)) return "TransferSyntax";

      // Aliases for the most useful tags
      else if (tag == Orthanc::DICOM_TAG_ACCESSION_NUMBER) return "AccessionNumber";
      else if (tag == Orthanc::DICOM_TAG_SOP_INSTANCE_UID) return "SopInstanceUid";
      else if (tag == Orthanc::DICOM_TAG_PATIENT_ID) return "PatientID";
      else if (tag == Orthanc::DICOM_TAG_SERIES_INSTANCE_UID) return "SeriesInstanceUid";
      else if (tag == Orthanc::DICOM_TAG_STUDY_INSTANCE_UID) return "StudyInstanceUid";
      else if (tag == Orthanc::DICOM_TAG_PIXEL_DATA) return "PixelData";

      else if (tag == Orthanc::DICOM_TAG_IMAGE_INDEX) return "ImageIndex";
      else if (tag == Orthanc::DICOM_TAG_INSTANCE_NUMBER) return "InstanceNumber";

      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_SLICES) return "NumberOfSlices";
      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_TIME_SLICES) return "NumberOfTimeSlices";
      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_FRAMES) return "NumberOfFrames";
      else if (tag == Orthanc::DICOM_TAG_CARDIAC_NUMBER_OF_IMAGES) return "CardiacNumberOfImages";
      else if (tag == Orthanc::DICOM_TAG_IMAGES_IN_ACQUISITION) return "ImagesInAcquisition";
      else if (tag == Orthanc::DICOM_TAG_PATIENT_NAME) return "PatientName";
      else if (tag == Orthanc::DICOM_TAG_ENCAPSULATED_DOCUMENT) return "EncapsulatedDocument";

      else if (tag == Orthanc::DICOM_TAG_STUDY_DESCRIPTION) return "StudyDescription";
      else if (tag == Orthanc::DICOM_TAG_SERIES_DESCRIPTION) return "SeriesDescription";
      else if (tag == Orthanc::DICOM_TAG_MODALITY) return "Modality";

      // The following is used for "modify/anonymize" operations
      else if (tag == Orthanc::DICOM_TAG_SOP_CLASS_UID) return "SopClassUid";
      else if (tag == Orthanc::DICOM_TAG_MEDIA_STORAGE_SOP_CLASS_UID) return "MediaStorageSopClassUid";
      else if (tag == Orthanc::DICOM_TAG_MEDIA_STORAGE_SOP_INSTANCE_UID) return "MediaStorageSopInstanceUid";
      else if (tag == Orthanc::DICOM_TAG_DEIDENTIFICATION_METHOD) return "DeidentificationMethod";

      // DICOM tags used for fMRI (thanks to Will Ryder)
      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_TEMPORAL_POSITIONS) return "NumberOfTemporalPositions";
      else if (tag == Orthanc::DICOM_TAG_TEMPORAL_POSITION_IDENTIFIER) return "TemporalPositionIdentifier";

      // Tags for C-FIND and C-MOVE
      else if (tag == Orthanc::DICOM_TAG_SPECIFIC_CHARACTER_SET) return "SpecificCharacterSet";
      else if (tag == Orthanc::DICOM_TAG_QUERY_RETRIEVE_LEVEL) return "QueryRetrieveLevel";
      else if (tag == Orthanc::DICOM_TAG_MODALITIES_IN_STUDY) return "ModalitiesInStudy";

      // Tags for images
      else if (tag == Orthanc::DICOM_TAG_COLUMNS) return "Columns";
      else if (tag == Orthanc::DICOM_TAG_ROWS) return "Rows";
      else if (tag == Orthanc::DICOM_TAG_SAMPLES_PER_PIXEL) return "SamplesPerPixel";
      else if (tag == Orthanc::DICOM_TAG_BITS_ALLOCATED) return "BitsAllocated";
      else if (tag == Orthanc::DICOM_TAG_BITS_STORED) return "BitsStored";
      else if (tag == Orthanc::DICOM_TAG_HIGH_BIT) return "HighBit";
      else if (tag == Orthanc::DICOM_TAG_PIXEL_REPRESENTATION) return "PixelRepresentation";
      else if (tag == Orthanc::DICOM_TAG_PLANAR_CONFIGURATION) return "PlanarConfiguration";
      else if (tag == Orthanc::DICOM_TAG_PHOTOMETRIC_INTERPRETATION) return "PhotometricInterpretation";
      else if (tag == Orthanc::DICOM_TAG_IMAGE_ORIENTATION_PATIENT) return "ImageOrientationPatient";
      else if (tag == Orthanc::DICOM_TAG_IMAGE_POSITION_PATIENT) return "ImagePositionPatient";

      // Tags related to date and time
      else if (tag == Orthanc::DICOM_TAG_ACQUISITION_DATE) return "AcquisitionDate";
      else if (tag == Orthanc::DICOM_TAG_ACQUISITION_TIME) return "AcquisitionTime";
      else if (tag == Orthanc::DICOM_TAG_CONTENT_DATE) return "ContentDate";
      else if (tag == Orthanc::DICOM_TAG_CONTENT_TIME) return "ContentTime";
      else if (tag == Orthanc::DICOM_TAG_INSTANCE_CREATION_DATE) return "InstanceCreationDate";
      else if (tag == Orthanc::DICOM_TAG_INSTANCE_CREATION_TIME) return "InstanceCreationTime";
      else if (tag == Orthanc::DICOM_TAG_PATIENT_BIRTH_DATE) return "PatientBirthDate";
      else if (tag == Orthanc::DICOM_TAG_PATIENT_BIRTH_TIME) return "PatientBirthTime";
      else if (tag == Orthanc::DICOM_TAG_SERIES_DATE) return "SeriesDate";
      else if (tag == Orthanc::DICOM_TAG_SERIES_TIME) return "SeriesTime";
      else if (tag == Orthanc::DICOM_TAG_STUDY_DATE) return "StudyDate";
      else if (tag == Orthanc::DICOM_TAG_STUDY_TIME) return "StudyTime";

      // Various tags
      else if (tag == Orthanc::DICOM_TAG_SERIES_TYPE) return "SeriesType";
      else if (tag == Orthanc::DICOM_TAG_REQUESTED_PROCEDURE_DESCRIPTION) return "RequestedProcedureDescription";
      else if (tag == Orthanc::DICOM_TAG_INSTITUTION_NAME) return "InstitutionName";
      else if (tag == Orthanc::DICOM_TAG_REQUESTING_PHYSICIAN) return "RequestingPhysician";
      else if (tag == Orthanc::DICOM_TAG_REFERRING_PHYSICIAN_NAME) return "ReferringPhysicianName";
      else if (tag == Orthanc::DICOM_TAG_OPERATOR_NAME) return "OperatorName";
      else if (tag == Orthanc::DICOM_TAG_PERFORMED_PROCEDURE_STEP_DESCRIPTION) return "PerformedProcedureStepDescription";
      else if (tag == Orthanc::DICOM_TAG_IMAGE_COMMENTS) return "ImageComments";
      else if (tag == Orthanc::DICOM_TAG_ACQUISITION_DEVICE_PROCESSING_DESCRIPTION) return "AcquisitionDeviceProcessingDescription";
      else if (tag == Orthanc::DICOM_TAG_CONTRAST_BOLUS_AGENT) return "ContrastBolusAgent";

      // Counting patients, studies and series
      // https://www.medicalconnections.co.uk/kb/Counting_Studies_Series_and_Instances
      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_PATIENT_RELATED_STUDIES) return "NumberOfPatientRelatedStudies";
      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_PATIENT_RELATED_SERIES) return "NumberOfPatientRelatedSeries";
      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_PATIENT_RELATED_INSTANCES) return "NumberOfPatientRelatedInstances";
      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_STUDY_RELATED_SERIES) return "NumberOfStudyRelatedSeries";
      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_STUDY_RELATED_INSTANCES) return "NumberOfStudyRelatedInstances";
      else if (tag == Orthanc::DICOM_TAG_NUMBER_OF_SERIES_RELATED_INSTANCES) return "NumberOfSeriesRelatedInstances";
      else if (tag == Orthanc::DICOM_TAG_SOP_CLASSES_IN_STUDY) return "SopClassesInStudy";

      // throw exception when tag is unknown
      else throw std::invalid_argument("unknown tag");
  }

  Json::Value ConvertDicomMapToJson(const Orthanc::DicomMap& map)
  {
    Json::Value json;
    Orthanc::DicomArray array(map);

    for(size_t i=0; i<array.GetSize(); ++i) {
      const Orthanc::DicomElement& element = array.GetElement(i);
      const Orthanc::DicomTag& tag = element.GetTag();
      const Orthanc::DicomValue& value = element.GetValue();

      // Retrieve tag name & ignore unknown tags
      std::string tagName;
      try {
        tagName = GetTagName(tag);
      }
      catch (const std::invalid_argument&) {
        continue;
      }

      // Ignore binary tags and null values
      if (value.IsBinary() || value.IsNull()) {
        continue;
      }

      // Set the json tag
      json[tagName] = Orthanc::Toolbox::StripSpaces(value.GetContent());
    }

    return json;
  }

  bool GetStringFromOrthanc(std::string& content,
                            OrthancPluginContext* context,
                            const std::string& uri)
  {
    OrthancPluginMemoryBuffer answer;

    if (OrthancPluginRestApiGetAfterPlugins(context, &answer, uri.c_str()))
    {
      return false;
    }

    if (answer.size)
    {
      try
      {
        content.assign(reinterpret_cast<const char*>(answer.data), answer.size);
      }
      catch (std::bad_alloc&)
      {
        OrthancPluginFreeMemoryBuffer(context, &answer);
        throw Orthanc::OrthancException(Orthanc::ErrorCode_NotEnoughMemory);
      }
    }

    OrthancPluginFreeMemoryBuffer(context, &answer);
    return true;
  }

  // content has to be freed with OrthancPluginFreeMemoryBuffer(context, &buffer)
  bool GetDicomFromOrthanc(OrthancPluginMemoryBuffer* content,
                            OrthancPluginContext* context,
                            const std::string& instanceId)
  {
    std::string uri = "/instances/" + instanceId + "/file";

    if (OrthancPluginRestApiGetAfterPlugins(context, content, uri.c_str()))
    {
      return false;
    }

    return true;
  }


  bool GetJsonFromOrthanc(Json::Value& json,
                          OrthancPluginContext* context,
                          const std::string& uri)
  {
    OrthancPluginMemoryBuffer answer;

    if (OrthancPluginRestApiGetAfterPlugins(context, &answer, uri.c_str()))
    {
      return false;
    }

    if (answer.size)
    {
      try
      {
        const char* data = reinterpret_cast<const char*>(answer.data);
        Json::Reader reader;
        if (!reader.parse(data, data + answer.size, json, 
                          false /* don't collect comments */))
        {
          return false;
        }
      }
      catch (std::runtime_error&)
      {
        OrthancPluginFreeMemoryBuffer(context, &answer);
        return false;
      }
    }

    OrthancPluginFreeMemoryBuffer(context, &answer);
    return true;
  }




  bool TokenizeVector(std::vector<float>& result,
                      const std::string& value,
                      unsigned int expectedSize)
  {
    std::vector<std::string> tokens;
    Orthanc::Toolbox::TokenizeString(tokens, value, '\\');

    if (tokens.size() != expectedSize)
    {
      return false;
    }

    result.resize(tokens.size());

    for (size_t i = 0; i < tokens.size(); i++)
    {
      try
      {
        result[i] = boost::lexical_cast<float>(tokens[i]);
      }
      catch (boost::bad_lexical_cast&)
      {
        return false;
      }
    }

    return true;
  }


  void CompressUsingDeflate(std::string& compressed,
                            OrthancPluginContext* context,
                            const void* uncompressed,
                            size_t uncompressedSize)
  {
    OrthancPluginMemoryBuffer tmp;
   
    OrthancPluginErrorCode code = OrthancPluginBufferCompression(
      context, &tmp, uncompressed, uncompressedSize, 
      OrthancPluginCompressionType_Zlib, 0 /*compress*/);
      
    if (code != OrthancPluginErrorCode_Success)
    {
      throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(code));
    }

    try
    {
      compressed.assign(reinterpret_cast<const char*>(tmp.data), tmp.size);
    }
    catch (...)
    {
      throw Orthanc::OrthancException(Orthanc::ErrorCode_NotEnoughMemory);
    }

    OrthancPluginFreeMemoryBuffer(context, &tmp);
  }


  const char* GetMimeType(const std::string& path)
  {
    size_t dot = path.find_last_of('.');

    std::string extension = (dot == std::string::npos) ? "" : path.substr(dot);
    std::transform(extension.begin(), extension.end(), extension.begin(), tolower);

    if (extension == ".html")
    {
      return "text/html";
    }
    else if (extension == ".css")
    {
      return "text/css";
    }
    else if (extension == ".js")
    {
      return "application/javascript";
    }
    else if (extension == ".gif")
    {
      return "image/gif";
    }
    else if (extension == ".svg")
    {
      return "image/svg+xml";
    }
    else if (extension == ".json")
    {
      return "application/json";
    }
    else if (extension == ".xml")
    {
      return "application/xml";
    }
    else if (extension == ".png")
    {
      return "image/png";
    }
    else if (extension == ".jpg" || extension == ".jpeg")
    {
      return "image/jpeg";
    }
    else
    {
      return "application/octet-stream";
    }
  }


  bool ReadConfiguration(Json::Value& configuration,
                         OrthancPluginContext* context)
  {
    std::string s;

    {
      char* tmp = OrthancPluginGetConfiguration(context);
      if (tmp == NULL)
      {
        OrthancPluginLogError(context, "Error while retrieving the configuration from Orthanc");
        return false;
      }

      s.assign(tmp);
      OrthancPluginFreeString(context, tmp);      
    }

    Json::Reader reader;
    if (reader.parse(s, configuration))
    {
      return true;
    }
    else
    {
      OrthancPluginLogError(context, "Unable to parse the configuration");
      return false;
    }
  }


  std::string GetStringValue(const Json::Value& configuration,
                             const std::string& key,
                             const std::string& defaultValue)
  {
    if (configuration.type() != Json::objectValue ||
        !configuration.isMember(key) ||
        configuration[key].type() != Json::stringValue)
    {
      return defaultValue;
    }
    else
    {
      return configuration[key].asString();
    }
  }  


  int GetIntegerValue(const Json::Value& configuration,
                      const std::string& key,
                      int defaultValue)
  {
    if (configuration.type() != Json::objectValue ||
        !configuration.isMember(key) ||
        configuration[key].type() != Json::intValue)
    {
      return defaultValue;
    }
    else
    {
      return configuration[key].asInt();
    }
  }

  bool GetBoolValue(const Json::Value& configuration,
                    const std::string& key,
                    bool defaultValue)
  {
    if (configuration.type() != Json::objectValue ||
        !configuration.isMember(key) ||
        configuration[key].type() != Json::booleanValue)
    {
      return defaultValue;
    }
    else
    {
      return configuration[key].asBool();
    }
  }

  OrthancPluginPixelFormat Convert(Orthanc::PixelFormat format)
  {
    switch (format)
    {
      case Orthanc::PixelFormat_Grayscale16:
        return OrthancPluginPixelFormat_Grayscale16;

      case Orthanc::PixelFormat_Grayscale8:
        return OrthancPluginPixelFormat_Grayscale8;

      case Orthanc::PixelFormat_RGB24:
        return OrthancPluginPixelFormat_RGB24;

      case Orthanc::PixelFormat_RGB48:
        return OrthancPluginPixelFormat_RGB48;

      case Orthanc::PixelFormat_RGBA32:
        return OrthancPluginPixelFormat_RGBA32;

      case Orthanc::PixelFormat_SignedGrayscale16:
        return OrthancPluginPixelFormat_SignedGrayscale16;

      default:
        throw Orthanc::OrthancException(Orthanc::ErrorCode_ParameterOutOfRange);
    }
  }


  Orthanc::PixelFormat Convert(OrthancPluginPixelFormat format)
  {
    switch (format)
    {
      case OrthancPluginPixelFormat_Grayscale16:
        return Orthanc::PixelFormat_Grayscale16;

      case OrthancPluginPixelFormat_Grayscale8:
        return Orthanc::PixelFormat_Grayscale8;

      case OrthancPluginPixelFormat_RGB24:
        return Orthanc::PixelFormat_RGB24;

      case OrthancPluginPixelFormat_RGB48:
        return Orthanc::PixelFormat_RGB48;

      case OrthancPluginPixelFormat_RGBA32:
        return Orthanc::PixelFormat_RGBA32;

      case OrthancPluginPixelFormat_SignedGrayscale16:
        return Orthanc::PixelFormat_SignedGrayscale16;

      default:
        throw Orthanc::OrthancException(Orthanc::ErrorCode_ParameterOutOfRange);
    }
  }


  void WriteJpegToMemory(std::string& result,
                         OrthancPluginContext* context,
                         const Orthanc::ImageAccessor& accessor,
                         uint8_t quality)
  {
    OrthancPluginMemoryBuffer tmp;
   
    OrthancPluginErrorCode code = OrthancPluginCompressJpegImage
      (context, &tmp, Convert(accessor.GetFormat()), 
       accessor.GetWidth(), accessor.GetHeight(), accessor.GetPitch(),
       accessor.GetConstBuffer(), quality);

    if (code != OrthancPluginErrorCode_Success)
    {
      throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(code));
    }

    try
    {
      result.assign(reinterpret_cast<const char*>(tmp.data), tmp.size);
    }
    catch (...)
    {
      throw Orthanc::OrthancException(Orthanc::ErrorCode_NotEnoughMemory);
    }

    OrthancPluginFreeMemoryBuffer(context, &tmp);
  }



  ImageReader::ImageReader(OrthancPluginContext* context,
                           const std::string& image,
                           OrthancPluginImageFormat format) : context_(context)
  {
    image_ = OrthancPluginUncompressImage(context_, image.c_str(), image.size(), format);

    if (image_ == NULL)
    {
      throw Orthanc::OrthancException(Orthanc::ErrorCode_CorruptedFile);
    }
  }


  ImageReader::~ImageReader()
  {
    OrthancPluginFreeImage(context_, image_);
  }


  void ImageReader::GetAccessor(Orthanc::ImageAccessor& output) const
  {
    output.AssignReadOnly(Convert(OrthancPluginGetImagePixelFormat(context_, image_)),
                            OrthancPluginGetImageWidth(context_, image_),
                            OrthancPluginGetImageHeight(context_, image_),
                            OrthancPluginGetImagePitch(context_, image_),
                            OrthancPluginGetImageBuffer(context_, image_));

  }

  Json::Value SanitizeTag(const std::string& tagName, const Json::Value& value) {
    // performs all kind of sanitizations to tags to correct invalid dicom tags from some modalities

    Json::Value sanitized = value;

    if (tagName == "Columns" || tagName == "Rows") { // Some US modalities have Rows="600\\0" !!!  keep only the first part

      std::string stringValue = value.asString();
      if (stringValue.find("\\") != std::string::npos) {
        sanitized = Json::Value(stringValue.substr(0, stringValue.find("\\")));
      }
    }

    return sanitized;
  }
}
