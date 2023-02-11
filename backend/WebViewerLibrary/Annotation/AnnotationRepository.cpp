#include "AnnotationRepository.h"

#include <iostream> // for std::cerr
#include <boost/foreach.hpp>
#include <boost/lexical_cast.hpp>

#include <json/json.h>
#include <json/reader.h>
#include <json/writer.h>
#include <json/value.h>

#include <Core/OrthancException.h> // for throws
#include "../BenchmarkHelper.h" // for BENCH(*)
#include "../OrthancContextManager.h" // for context_ global
#include "../ViewerToolbox.h" // for OrthancPlugins::get*FromOrthanc && OrthancPluginImage
#include "../Image/Utilities/ScopedBuffers.h" // for ScopedOrthancPluginMemoryBuffer


namespace
{
  std::string _getAttachmentNumber(const std::string &studyId);
}

AnnotationRepository::AnnotationRepository() {
  this->_isAnnotationStorageEnabled = false;
}

Json::Value AnnotationRepository::getByStudyId(const std::string studyId) const
{
  Json::Value result;

  // Throw exception if annotation storage is disabled
  if (!this->_isAnnotationStorageEnabled) {
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadRequest);
  }

  // Load json from orthanc
  std::string url = "/studies/" + studyId + "/attachments/" + _getAttachmentNumber(studyId) + "/data";
  ScopedOrthancPluginMemoryBuffer buffer(OrthancContextManager::Get());
  Orthanc::ErrorCode error = static_cast<Orthanc::ErrorCode>(OrthancPluginRestApiGetAfterPlugins(OrthancContextManager::Get(), buffer.getPtr(), url.c_str()));

  // Return JSON on success
  if (error == Orthanc::ErrorCode_Success) {
    // Parse attachment as JSON
    std::string bufferStr = std::string(buffer.getDataChar(), buffer.getSize());
    Json::Reader reader;

    // Throw exception on malformatted json
    if (!reader.parse(bufferStr, result)) {
      throw Orthanc::OrthancException(Orthanc::ErrorCode_BadFileFormat);
    }

    // Return JSON
    return result;
  }
  // Return an empty value if value has not been found
  else if (error == Orthanc::ErrorCode_UnknownResource) {
    // Create an empty json object
    Json::Reader reader;
    reader.parse("{}", result);
    assert(result != Json::nullValue);

    // Return empty JSON
    return result;
  }
  // Throw an exception on other errors
  else {
    throw Orthanc::OrthancException(error);
  }
}

void AnnotationRepository::setByImageId(const std::string &instanceId, uint32_t frameIndex, const Json::Value& value) const
{
  // @warning non-atomic operation, data loss may occurs if multiple
  // annotations are stored within the same study.
  
  // Throw exception if annotation storage is disabled
  if (!this->_isAnnotationStorageEnabled) {
    throw Orthanc::OrthancException(Orthanc::ErrorCode_BadRequest);
  }
  
  // Retrieve image's study id, because we store annotations at the study 
  // level (to reduce db calls).
  std::string url = "/instances/" + instanceId + "/study";
  Json::Value studyData;
  if (!OrthancPlugins::GetJsonFromOrthanc(studyData, OrthancContextManager::Get(), url)) {
    // Throw error when we weren't able to retrieve the study of the instance.
    // It'll most likely happen if the instance doesn't exists.
    throw Orthanc::OrthancException(Orthanc::ErrorCode_UnknownResource);
  }
  std::string studyId = studyData["ID"].asString();

  // First, retrieve the whole study's annotations.
  Json::Value annotationsByImageIds = this->getByStudyId(studyId);

  // Cleanup removed annotations from the json.
  std::string imageId = instanceId + std::string(":") + boost::lexical_cast<std::string>(frameIndex);
  if (annotationsByImageIds.isMember(imageId)) {
    annotationsByImageIds[imageId] = Json::Value(Json::objectValue);
  }

  // Add the current image's annotation to the json.
  for (Json::ValueConstIterator it = value.begin(); it != value.end(); it++) {
    std::string tool = it.key().asString();
    const Json::Value &annotations = *it;
    annotationsByImageIds[imageId][tool] = annotations;
  }

  // Store the json back as a study attachment
  url = "/studies/" + studyId + "/attachments/" + _getAttachmentNumber(studyId);
  Json::FastWriter fastWriter;
  std::string annotationsByImageIdsStr = fastWriter.write(annotationsByImageIds);
  ScopedOrthancPluginMemoryBuffer buffer(OrthancContextManager::Get());
  Orthanc::ErrorCode error = static_cast<Orthanc::ErrorCode>(OrthancPluginRestApiPutAfterPlugins(OrthancContextManager::Get(), buffer.getPtr(), url.c_str(), annotationsByImageIdsStr.c_str(), annotationsByImageIdsStr.size()));

  // Do nothing of success (`value` is modified by reference, no need to return)
  if (error == Orthanc::ErrorCode_Success) {

  }
  // Study should always be found, has its id has been retrieved via Orthanc. 
  // However, study may have been removed in the few millisecond between that,
  // therefore we rethrow the unknown resource exception.
  else if (error == Orthanc::ErrorCode_UnknownResource) {
    throw Orthanc::OrthancException(error);
  }
  // Throw error on any other failure
  else {
    throw Orthanc::OrthancException(error);
  }
}

namespace
{
  std::string _getAttachmentNumber(const std::string &studyId)
  {
    std::string attachmentNumber;
    int attachmentPrefix = 9999; // `Image Cache's attachmentPrefix` - 1

    attachmentNumber = boost::lexical_cast<std::string>(attachmentPrefix);

    return attachmentNumber;
  }
}
