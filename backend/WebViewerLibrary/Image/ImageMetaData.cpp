#include "ImageMetaData.h"

#include <cmath> // for std::pow
#include <vector>
#include <boost/foreach.hpp>
#include <boost/lexical_cast.hpp>
#include <boost/regex.hpp>
#include <boost/algorithm/string.hpp> // for boost::algorithm::split

#include "../BenchmarkHelper.h"
#include <Core/Toolbox.h> // for TokenizeString && StripSpaces
#include <Core/Images/ImageProcessing.h> // for GetMinMaxValue
#include <Core/OrthancException.h> // for throws
#include "ViewerToolbox.h"

namespace
{
  float GetFloatTag(const Json::Value& dicomTags,
                           const std::string& tagName,
                           float defaultValue);
  std::vector<float> GetFloatListTag(const Json::Value& dicomTags,
                           const std::string& tagName,
                           float defaultValue);
  bool GetStringTag(std::string& result,
                           const Json::Value& dicomTags,
                           const std::string& tagName);
}

using namespace Orthanc;

ImageMetaData::ImageMetaData()
{
  height = 0;
  width = 0;
  sizeInBytes = 0;

  minPixelValue = 0;
  maxPixelValue = 0;

  inverted = false;

  // frontend webviewer related
  stretched = false;
}

ImageMetaData::ImageMetaData(RawImageContainer* rawImage, const Json::Value& dicomTags)
{
  // Generate metadata from an image and its tags

  BENCH(CALCULATE_METADATA)
  ImageAccessor* accessor = rawImage->GetOrthancImageAccessor();

  // set width/height
  height = accessor->GetHeight();
  width = accessor->GetWidth();

  // set min/max
  switch (accessor->GetFormat())
  {
    case PixelFormat_Grayscale8:
    case PixelFormat_Grayscale16:
    case PixelFormat_SignedGrayscale16:
    {
      int64_t a, b;

      // @todo don't process when tag is available
      ImageProcessing::GetMinMaxIntegerValue(a, b, *accessor);
      minPixelValue = (a < 0 ? static_cast<int32_t>(a) : 0);
      maxPixelValue = (b > 0 ? static_cast<int32_t>(b) : 1);
      break;
    }
    case PixelFormat_RGB24:
    {
      minPixelValue = 0;
      maxPixelValue = 255;
      break;
    case PixelFormat_RGB48:
      {
        minPixelValue = 0;
        maxPixelValue = 65535;
        break;
      }
    }
    default:
    {
      // @todo throw
    }
  }
  
  // set sizeInBytes
  sizeInBytes = accessor->GetSize();

  // Invert color in the backend if the photometric interpretation is
  // MONOCHROME1.
  inverted = (dicomTags["PhotometricInterpretation"].asString() == "MONOCHROME1");

  // frontend webviewer related
  stretched = false;

  BENCH_LOG(IMAGE_WIDTH, width);
  BENCH_LOG(IMAGE_HEIGHT, height);
}

ImageMetaData::ImageMetaData(const DicomMap& headerTags, const Json::Value& dicomTags)
{
  // Generate metadata from tags only (a bit less accurate than the other
  // constructor - maxPixelValue can't be processed from image) headerTags
  // retrieved from dicom file dicomTags retrived from Orthanc sqlite

  BENCH(CALCULATE_METADATA)

  // set minPixelValue & maxPixelValue
  int bitsStored = boost::lexical_cast<int>(Toolbox::StripSpaces(dicomTags["BitsStored"].asString()));
  minPixelValue = 0; // approximative value
  maxPixelValue = 2 << (bitsStored-1); // approximative value

  // set width/height
  width = boost::lexical_cast<uint32_t>(Toolbox::StripSpaces(OrthancPlugins::SanitizeTag("Columns", dicomTags["Columns"]).asString()));
  height = boost::lexical_cast<uint32_t>(Toolbox::StripSpaces(OrthancPlugins::SanitizeTag("Rows", dicomTags["Rows"]).asString()));

  // set sizeInBytes
  std::string photometricInterpretation = Toolbox::StripSpaces(dicomTags["PhotometricInterpretation"].asString());
  bool color;
  if (photometricInterpretation == "MONOCHROME1" || photometricInterpretation == "MONOCHROME2") {
    color = false;
  }
  else {
    color = true;
  }
  int bitsAllocated = boost::lexical_cast<int>(Toolbox::StripSpaces(dicomTags["BitsAllocated"].asString())) * (color ? 3 : 1);
  sizeInBytes = width * height * ((bitsAllocated + 7)/8);

  // set stretched image (16bit -> 8bit dynamic compression)
  stretched = false;

  // We never invert the color in the backend when the input image is
  // compressed, even if the photometric interpretation is MONOCHROME1.
  // Therefore, we avoid having to decompress the image in the backend, while
  // we do the color inversion processing in the frontend.
  inverted = false;

  BENCH_LOG(IMAGE_WIDTH, width);
  BENCH_LOG(IMAGE_HEIGHT, height);
}

namespace {
  float GetFloatTag(const Json::Value& dicomTags,
                           const std::string& tagName,
                           float defaultValue)
  {
    std::string tmp;
    if (GetStringTag(tmp, dicomTags, tagName))
    {
      try
      {
        return boost::lexical_cast<float>(Toolbox::StripSpaces(tmp));
      }
      catch (boost::bad_lexical_cast&)
      {
      }
    }

    return defaultValue;
  }

  std::vector<float> GetFloatListTag(const Json::Value& dicomTags,
                           const std::string& tagName,
                           float defaultValue)
  {
    std::string fullStr;
    std::vector<float> floatList;

    if(GetStringTag(fullStr, dicomTags, tagName)) {
      // Split tags content by "\" character
      std::vector<std::string> strs;
      boost::algorithm::split(strs, fullStr, boost::is_any_of("\\"));

      // Convert each part of the string to float
      BOOST_FOREACH(const std::string& str, strs)
      {
        try
        {
          float value = boost::lexical_cast<float>(Toolbox::StripSpaces(str));
          floatList.push_back(value);
        }
        catch (boost::bad_lexical_cast&)
        {
        }
      }
    }

    // Set the default value if none has been found
    if (floatList.size() == 0)
    {
      floatList.push_back(defaultValue);
    }
    
    return floatList;
  }

  bool GetStringTag(std::string& result,
                           const Json::Value& dicomTags,
                           const std::string& tagName)
  {
    if (dicomTags.type() == Json::objectValue &&
        dicomTags.isMember(tagName) &&
        dicomTags[tagName].type() == Json::stringValue)
    {
      result = dicomTags[tagName].asString();
      return true;
    }        
    else
    {
      return false;
    }
  }
}
