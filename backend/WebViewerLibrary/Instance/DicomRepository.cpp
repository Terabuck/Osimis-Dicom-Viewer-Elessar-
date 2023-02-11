#include "DicomRepository.h"

#include <boost/thread/lock_guard.hpp> 
#include <boost/foreach.hpp>
#include "../BenchmarkHelper.h" // for BENCH(*)
#include "../OrthancContextManager.h" // for context_ global
#include "../ViewerToolbox.h" // for OrthancPlugins::get*FromOrthanc && OrthancPluginImage
#include <Core/OrthancException.h> // for throws

namespace
{
void _loadDICOM(OrthancPluginMemoryBuffer& dicomOutput, const std::string& instanceId);
}

void DicomRepository::invalidateDicomFile(const std::string instanceId)
{
  boost::lock_guard<boost::mutex> guard(_dicomFilesMutex);

  for (std::deque<DicomFile>::iterator it = _dicomFiles.begin(); it != _dicomFiles.end(); it++)
  {
    if (it->instanceId == instanceId)
    {
      OrthancPluginFreeMemoryBuffer(OrthancContextManager::Get(), &(it->dicomFileBuffer));
      _dicomFiles.erase(it);
      return;
    }
  }
}

void DicomRepository::getDicomFile(const std::string instanceId, OrthancPluginMemoryBuffer& dicomFileBuffer) const
{
  boost::lock_guard<boost::mutex> guard(_dicomFilesMutex);

  // Retrieve dicom file if cached
  BOOST_FOREACH(DicomFile& dicomFile, _dicomFiles)
  {
    if (dicomFile.instanceId == instanceId)
    {
      dicomFileBuffer = dicomFile.dicomFileBuffer;
      dicomFile.refCount++;
      return;
    }
  }

  //load the dicom file now (the dicomFilesMutex is still locked, this will prevent other threads to request the loading as well)
  if (_dicomFiles.size() > 3) //remove the oldest file that is not used
  {
    for (std::deque<DicomFile>::iterator it = _dicomFiles.begin(); it != _dicomFiles.end(); it++)
    {
      if (it->instanceId != instanceId && it->refCount == 0)
      {
        OrthancPluginFreeMemoryBuffer(OrthancContextManager::Get(), &(it->dicomFileBuffer));
        _dicomFiles.erase(it);
        break;
      }
    }
  }

  _loadDICOM(dicomFileBuffer, instanceId);
  DicomFile dicomFile;
  dicomFile.refCount = 1;
  dicomFile.instanceId = instanceId;
  dicomFile.dicomFileBuffer = dicomFileBuffer;
  _dicomFiles.push_back(dicomFile);
}

void DicomRepository::decrefDicomFile(const std::string instanceId) const
{
  boost::lock_guard<boost::mutex> guard(_dicomFilesMutex);

  BOOST_FOREACH(DicomFile& dicomFile, _dicomFiles)
  {
    if (dicomFile.instanceId == instanceId)
    {
      assert(dicomFile.refCount >= 1);
      dicomFile.refCount--;
      return;
    }
  }
  assert(false); //it means we did not find the file
}

DicomRepository::~DicomRepository()
{
  for (std::deque<DicomFile>::iterator it = _dicomFiles.begin(); it != _dicomFiles.end(); it++)
  {
    OrthancPluginFreeMemoryBuffer(OrthancContextManager::Get(), &(it->dicomFileBuffer));
  }
}

namespace
{
using namespace OrthancPlugins;

void _loadDICOM(OrthancPluginMemoryBuffer& dicomOutput, const std::string& instanceId)
{
  BENCH(LOAD_DICOM);

  if (!GetDicomFromOrthanc(&dicomOutput, OrthancContextManager::Get(), instanceId)) {
    throw Orthanc::OrthancException(Orthanc::ErrorCode_UnknownResource);
  }
  BENCH_LOG(DICOM_SIZE, dicomOutput.size);
}
}