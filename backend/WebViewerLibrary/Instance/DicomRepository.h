#pragma once

#include <boost/thread/mutex.hpp>
#include <boost/noncopyable.hpp>
#include <deque>
#include <string>
#include <orthanc/OrthancCPlugin.h>

/** DicomRepository [@Repository]
 *
 * Retrieve a Dicom file from an instance uid.
 *
 * @Responsibility Handle all the I/O operations related to Dicom Files
 *
 * @Responsibility Manage cache
 *   Note the cache is stateful and thus is not compatible with the Osimis cloud load-balancer
 *   stateless requirements !
 *
 */
class DicomRepository : public boost::noncopyable {
public:
  class ScopedDecref
  {
    DicomRepository* repository_;
    const std::string& instanceId_;
  public:
    ScopedDecref(DicomRepository* repository, const std::string& instanceId)
      : repository_(repository),
        instanceId_(instanceId)
    {
    }

    ~ScopedDecref()
    {
      repository_->decrefDicomFile(instanceId_);
    }
  };

private:

  struct DicomFile
  {
    std::string                     instanceId;
    OrthancPluginMemoryBuffer       dicomFileBuffer;
    int                             refCount;
  };

public:
  void getDicomFile(const std::string instanceId, OrthancPluginMemoryBuffer& buffer) const; // throws Orthanc::ErrorCode_UnknownResource
//  void increfDicomFile(const std::string instanceId);
  void decrefDicomFile(const std::string instanceId) const;
  void invalidateDicomFile(const std::string instanceId);
//  void addDicomFile(const std::string instanceId, OrthancPluginMemoryBuffer& buffer);
  ~DicomRepository();

private:
  mutable std::deque<DicomFile> _dicomFiles; //keep a few of the last dicomFile in memory to avoid reloading them many times when requesting different frames or different image quality
  mutable boost::mutex          _dicomFilesMutex; //to prevent multiple threads modifying the _dicomFiles
};
