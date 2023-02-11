#ifndef I_IMAGE_CONTAINER_H
#define I_IMAGE_CONTAINER_H

#include <boost/cstdint.hpp> // for uint32_t

/** IImageContainer [@Entity]
 *
 */
class IImageContainer {
public:
  IImageContainer() {}
  virtual ~IImageContainer() {}
  
  virtual const char* GetBinary() const = 0;
  virtual uint32_t GetBinarySize() const = 0;
};

#endif // I_IMAGE_CONTAINER_H
