#ifndef KLVWRITER_H
#define KLVWRITER_H

#include <boost/cstdint.hpp> // for uint32_t
#include <boost/tuple/tuple.hpp>
#include <boost/numeric/conversion/cast.hpp>
#include <string>
#include <vector>

#include <Core/Toolbox.h> // for DetectEndianness
#include <Core/Enumerations.h> // for Endianness

// see https://en.wikipedia.org/wiki/KLV
// key & length are written in big endian
// integer values are written in big endian
class KLVWriter
{
public:
  KLVWriter();

  // works with std::string
  // convert any int into big endian
  template<typename T>
  inline void setValue(uint32_t key, const T& value);

  // @param value never copied, it has to be kept in memory
  // do not convert endianness
  void setValue(uint32_t key, size_t length, const char* value);

  std::string write();

private:
  // key, length, value, convertValueEndiannessIfNeeded
  typedef boost::tuple<uint32_t, uint32_t, const uint8_t*, bool> KLVTuple;
  std::vector<KLVTuple> klv_tuples_;
  size_t total_size_;
};

// converted to big endian
template<typename T>
inline void KLVWriter::setValue(uint32_t key, const T& value)
{
  KLVTuple klvTuple(key, boost::numeric_cast<uint32_t>(sizeof(value)), reinterpret_cast<const uint8_t *>(&value), true);
  klv_tuples_.push_back(klvTuple);

  total_size_ += 4 + 4 + sizeof(value); // key byte + length byte + value length
}

// no endianness conversion
template<>
inline void KLVWriter::setValue<std::string>(uint32_t key, const std::string& value)
{
  setValue(key, value.size(), value.c_str());
}

#endif // KLVWRITER_H
