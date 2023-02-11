#pragma once

#include <string>

/** ImageQuality
 *
 * @ValueObject (stateless/thread-safe)
 *
 * Describe a generic image quality.
 * Used instead of explicit image format name to avoid adding compression overhead on an already compressed image
 * when an api user ask for an image.
 *
 */
struct ImageQuality {
  enum EImageQuality {
    NONE = 0,

    LOW = 1,
    MEDIUM = 2,
    LOSSLESS = 3, // lossless PNG compressed
    PIXELDATA = 4 // Without transcoding (pixeldata from dicomfile)
  };

  ImageQuality(EImageQuality quality) : _quality(quality) {}
  ImageQuality(const ImageQuality& o) : _quality(o._quality) {}

  bool operator<(const ImageQuality& o) const { return _quality < o._quality; }
  bool operator<=(const ImageQuality& o) const { return _quality <= o._quality; }
  bool operator==(const ImageQuality& o) const { return _quality == o._quality; }
  bool operator>(const ImageQuality& o) const { return _quality > o._quality; }
  bool operator>=(const ImageQuality& o) const { return _quality >= o._quality; }
  //ImageQuality& ImageQuality::operator=(const ImageQuality& o) {this->_quality = o._quality; return *this;}

  inline EImageQuality toInt() const {
    return _quality;
  }
  inline std::string toString() const {
    switch(_quality) {
    case LOW:
      return "low";
    case MEDIUM:
      return "medium";
    case LOSSLESS:
      return "lossless";
    case PIXELDATA:
      return "pixeldata";
    case NONE:
      return "unknown";
    }

    return "unknown";
  }

  static inline EImageQuality fromString(const std::string& qualityString) {
    if (qualityString == "low")
        return LOW;
    if (qualityString == "medium")
        return MEDIUM;
    if (qualityString == "lossless")
        return LOSSLESS;
    if (qualityString == "pixeldata")
        return PIXELDATA;

    return NONE;
  }

  inline std::string toProcessingPolicytString() const {
    switch(_quality) {
    case LOW:
      return "low-quality";
    case MEDIUM:
      return "medium-quality";
    case LOSSLESS:
      return "high-quality";
    case PIXELDATA:
      return "pixeldata-quality";
    case NONE:
      return "unknown";
    }
    return "unknown";
  }

  static inline EImageQuality fromProcessingPolicytString(const std::string& processingPolicyString) {
    if (processingPolicyString == "low-quality")
        return LOW;
    if (processingPolicyString == "medium-quality")
        return MEDIUM;
    if (processingPolicyString == "high-quality")
        return LOSSLESS;
    if (processingPolicyString == "pixeldata-quality")
        return PIXELDATA;

    return NONE;
  }


private:
  const EImageQuality _quality;
};
