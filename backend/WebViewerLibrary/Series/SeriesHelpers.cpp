#include "SeriesHelpers.h"

#include <Core/OrthancException.h>
#include <Core/Toolbox.h>
#include "ViewerToolbox.h"

// this is basically a copy of the SliceOrdering code from Orthanc except that the order is inverted (when
// slices are ordered by position

static bool TokenizeVector(std::vector<float>& result,
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

static bool IsCloseToZero(double x)
{
  return fabs(x) < 10.0 * std::numeric_limits<float>::epsilon();
}

typedef float Vector[3];


bool ComputeNormal(Vector& normal,
                          const std::string& tagValue)
{
  std::vector<float> cosines;

  if (TokenizeVector(cosines, tagValue, 6))
  {
    assert(cosines.size() == 6);
    normal[0] = cosines[1] * cosines[5] - cosines[2] * cosines[4];
    normal[1] = cosines[2] * cosines[3] - cosines[0] * cosines[5];
    normal[2] = cosines[0] * cosines[4] - cosines[1] * cosines[3];
    return true;
  }
  else
  {
    return false;
  }
}

bool IsParallelOrOpposite(const Vector& u,
                                         const Vector& v)
{
  // Check out "GeometryToolbox::IsParallelOrOpposite()" in Stone of
  // Orthanc for explanations
  const double u1 = u[0];
  const double u2 = u[1];
  const double u3 = u[2];
  const double normU = sqrt(u1 * u1 + u2 * u2 + u3 * u3);

  const double v1 = v[0];
  const double v2 = v[1];
  const double v3 = v[2];
  const double normV = sqrt(v1 * v1 + v2 * v2 + v3 * v3);

  if (IsCloseToZero(normU * normV))
  {
    return false;
  }
  else
  {
    const double cosAngle = (u1 * v1 + u2 * v2 + u3 * v3) / (normU * normV);

    return (IsCloseToZero(cosAngle - 1.0) ||      // Close to +1: Parallel, non-opposite
            IsCloseToZero(fabs(cosAngle) - 1.0)); // Close to -1: Parallel, opposite
  }
}

struct Instance : public boost::noncopyable
{
private:
  std::string   instanceId_;
  bool          hasPosition_;
  Vector        position_;
  bool          hasNormal_;
  Vector        normal_;
  bool          hasIndexInSeries_;
  size_t        indexInSeries_;
  unsigned int  framesCount_;

public:
  Instance(const Json::Value& instanceInfoInSeries) :
    framesCount_(1)
  {
    instanceId_ = instanceInfoInSeries["ID"].asString();

    if (instanceInfoInSeries["MainDicomTags"].isMember("NumberOfFrames"))
    {
      try
      {
        framesCount_ = boost::lexical_cast<unsigned int>(instanceInfoInSeries["MainDicomTags"]["NumberOfFrames"].asString());
      }
      catch (boost::bad_lexical_cast&)
      {
      }
    }

    std::vector<float> tmp;
    hasPosition_ = instanceInfoInSeries["MainDicomTags"].isMember("ImagePositionPatient") && TokenizeVector(tmp, instanceInfoInSeries["MainDicomTags"]["ImagePositionPatient"].asString(), 3);

    if (hasPosition_)
    {
      position_[0] = tmp[0];
      position_[1] = tmp[1];
      position_[2] = tmp[2];
    }

    hasNormal_ = instanceInfoInSeries["MainDicomTags"].isMember("ImageOrientationPatient") && ComputeNormal(normal_, instanceInfoInSeries["MainDicomTags"]["ImageOrientationPatient"].asString());

    std::string s;
    hasIndexInSeries_ = false;

    if (instanceInfoInSeries["MainDicomTags"].isMember("InstanceNumber"))
    {
      try
      {
        indexInSeries_ = boost::lexical_cast<unsigned int>(Orthanc::Toolbox::StripSpaces(instanceInfoInSeries["MainDicomTags"]["InstanceNumber"].asString()));
        hasIndexInSeries_ = true;
      }
      catch (boost::bad_lexical_cast&)
      {
      }
    }

    if (!hasIndexInSeries_ && instanceInfoInSeries["MainDicomTags"].isMember("ImageIndex"))
    {
      try
      {
        indexInSeries_ = boost::lexical_cast<unsigned int>(Orthanc::Toolbox::StripSpaces(instanceInfoInSeries["MainDicomTags"]["ImageIndex"].asString()));
        hasIndexInSeries_ = true;
      }
      catch (boost::bad_lexical_cast&)
      {
      }
    }
  }

  const std::string& GetIdentifier() const
  {
    return instanceId_;
  }

  bool HasPosition() const
  {
    return hasPosition_;
  }

  float ComputeRelativePosition(const Vector& normal) const
  {
    assert(HasPosition());
    return (normal[0] * position_[0] +
            normal[1] * position_[1] +
            normal[2] * position_[2]);
  }

  bool HasIndexInSeries() const
  {
    return hasIndexInSeries_;
  }

  size_t GetIndexInSeries() const
  {
    assert(HasIndexInSeries());
    return indexInSeries_;
  }

  unsigned int GetFramesCount() const
  {
    return framesCount_;
  }

  bool HasNormal() const
  {
    return hasNormal_;
  }

  const Vector& GetNormal() const
  {
    assert(hasNormal_);
    return normal_;
  }
};


class PositionComparator
{
private:
  const Vector&  normal_;

public:
  PositionComparator(const Vector& normal) : normal_(normal)
  {
  }

  int operator() (const Instance* a,
                  const Instance* b) const
  {
    return a->ComputeRelativePosition(normal_) > b->ComputeRelativePosition(normal_);
  }
};



class SliceOrdering
{
private:

  std::string              seriesId_;
  bool                     hasNormal_;
  Vector                   normal_;
  std::vector<Instance*>   instances_;        // this vector owns the instances
  std::vector<Instance*>   sortedInstances_;  // this vectore references the instances of instances_
  bool                     isVolume_;

  static bool IndexInSeriesComparator(const Instance* a,
                                      const Instance* b)
  {
    return a->GetIndexInSeries() < b->GetIndexInSeries();
  }

  bool SortUsingPositions()
  {
    if (instances_.size() <= 1)
    {
      // One single instance: It is sorted by default
      sortedInstances_ = instances_;
      return true;
    }

    if (!hasNormal_)
    {
      return false;
    }

    sortedInstances_.clear();

    // consider only the instances with a position and correctly oriented (if they have a normal)
    for (size_t i = 0; i < instances_.size(); i++)
    {
      assert(instances_[i] != NULL);
      if (instances_[i]->HasPosition() &&
          (!instances_[i]->HasNormal() ||
           IsParallelOrOpposite(instances_[i]->GetNormal(), normal_)))
      {
        sortedInstances_.push_back(instances_[i]);
      }
    }

    if (sortedInstances_.size() != instances_.size()) // if instances are missing, sort using index in series
    {
      return false;
    }

    PositionComparator comparator(normal_);
    std::sort(sortedInstances_.begin(), sortedInstances_.end(), comparator);

    float a = sortedInstances_[0]->ComputeRelativePosition(normal_);
    for (size_t i = 1; i < sortedInstances_.size(); i++)
    {
      float b = sortedInstances_[i]->ComputeRelativePosition(normal_);

      if (std::fabs(b - a) <= 10.0f * std::numeric_limits<float>::epsilon())
      {
        // Not enough space between two slices along the normal of the volume
        return false;
      }

      a = b;
    }

    // This is a 3D volume
    isVolume_ = true;
    return true;
  }


  bool SortUsingIndexInSeries()
  {
    if (instances_.size() <= 1)
    {
      // One single instance: It is sorted by default
      sortedInstances_ = instances_;
      return true;
    }

    sortedInstances_.clear();

    // consider only the instances with an index
    for (size_t i = 0; i < instances_.size(); i++)
    {
      assert(instances_[i] != NULL);
      if (instances_[i]->HasIndexInSeries())
      {
        sortedInstances_.push_back(instances_[i]);
      }
    }

    if (sortedInstances_.size() == 0) // if we were not able to sort instances because none of them had an index, return all instances in a "random" order
    {
      sortedInstances_ = instances_;
    }
    else
    {
      std::sort(sortedInstances_.begin(), sortedInstances_.end(), IndexInSeriesComparator);

      for (size_t i = 1; i < sortedInstances_.size(); i++)
      {
        if (sortedInstances_[i - 1]->GetIndexInSeries() == sortedInstances_[i]->GetIndexInSeries())
        {
          // The current "IndexInSeries" occurs 2 times: Not a proper ordering
          LOG(WARNING) << "This series contains 2 slices with the same index, trying to display it anyway";
          break;
        }
      }
    }

    return true;
  }


public:
  SliceOrdering(const Json::Value& seriesInfo, const Json::Value& seriesInstancesInfo, const std::string& seriesId)
    : seriesId_(seriesId)
  {
    hasNormal_ = seriesInfo["MainDicomTags"].isMember("ImageOrientationPatient") && ComputeNormal(normal_, seriesInfo["MainDicomTags"]["ImageOrientationPatient"].asString());

    instances_.reserve(seriesInstancesInfo.size());
    for (Json::ArrayIndex i = 0; i < seriesInstancesInfo.size(); i++)
    {
      instances_.push_back(new Instance(seriesInstancesInfo[i]));
    }

    if (!SortUsingPositions() &&
        !SortUsingIndexInSeries())
    {
      throw Orthanc::OrthancException(Orthanc::ErrorCode_CannotOrderSlices,
                             "Unable to order the slices of series " + seriesId);
    }

  }

  ~SliceOrdering()
  {
    for (std::vector<Instance*>::iterator
           it = instances_.begin(); it != instances_.end(); ++it)
    {
      if (*it != NULL)
      {
        delete *it;
      }
    }

  }

  size_t  GetSortedInstancesCount() const
  {
    return sortedInstances_.size();
  }

  const std::string& GetSortedInstanceId(size_t index) const
  {
    if (index >= sortedInstances_.size())
    {
      throw Orthanc::OrthancException(Orthanc::ErrorCode_ParameterOutOfRange);
    }
    else
    {
      return sortedInstances_[index]->GetIdentifier();
    }
  }

  unsigned int GetSortedInstanceFramesCount(size_t index) const
  {
    if (index >= sortedInstances_.size())
    {
      throw Orthanc::OrthancException(Orthanc::ErrorCode_ParameterOutOfRange);
    }
    else
    {
      return sortedInstances_[index]->GetFramesCount();
    }
  }

  void Format(Json::Value& result) const
  {
    result = Json::arrayValue;

    for (size_t i = 0; i < GetSortedInstancesCount(); i++)
    {
      Json::Value tmp = Json::arrayValue;
      tmp.append(GetSortedInstanceId(i));
      tmp.append(0);
      tmp.append(GetSortedInstanceFramesCount(i));

      result.append(tmp);
    }
  }

};


// recreates the "SlicesShort" field of the ordered-slices route for a series.
// the ordered-slices is a bit buggy so we need to validate/recompute the output
void SeriesHelpers::GetOrderedSeries(OrthancPluginContext* context, Json::Value& orderedSlicesShort, const std::string& seriesId)
{
  // Retrieve series' slices (instances & frames)
  Json::Value seriesInfo;
  if (!OrthancPlugins::GetJsonFromOrthanc(seriesInfo, context, "/series/" + seriesId))
  {
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_InexistentItem));
  }

  Json::Value seriesInstancesInfo;
  if (!OrthancPlugins::GetJsonFromOrthanc(seriesInstancesInfo, context, "/series/" + seriesId + "/instances"))
  {
    throw Orthanc::OrthancException(static_cast<Orthanc::ErrorCode>(OrthancPluginErrorCode_InexistentItem));
  }

  SliceOrdering ordering(seriesInfo, seriesInstancesInfo, seriesId);
  ordering.Format(orderedSlicesShort);
}

