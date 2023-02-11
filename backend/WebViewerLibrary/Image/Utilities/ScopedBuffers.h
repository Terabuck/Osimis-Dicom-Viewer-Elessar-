#pragma once

#include <orthanc/OrthancCPlugin.h>
#include <stdint.h>
#include <vector>
#include <boost/noncopyable.hpp>

class ScopedOrthancPluginMemoryBuffer : public boost::noncopyable
{
  OrthancPluginMemoryBuffer _memoryBuffer;
  OrthancPluginContext*     _context;

public:
    ScopedOrthancPluginMemoryBuffer(OrthancPluginContext* context)
      : _context(context)
    {
      _memoryBuffer.data = NULL;
      _memoryBuffer.size = 0;
    }

    ScopedOrthancPluginMemoryBuffer(OrthancPluginContext* context, const OrthancPluginMemoryBuffer& buffer)
      : _context(context)
    {
      _memoryBuffer.data = buffer.data;
      _memoryBuffer.size = buffer.size;
    }

    ~ScopedOrthancPluginMemoryBuffer()
    {
      OrthancPluginFreeMemoryBuffer(_context, &_memoryBuffer);
    }

   OrthancPluginMemoryBuffer* getPtr()
   {
     return &_memoryBuffer;
   }

   unsigned char* getDataUChar()
   {
     return reinterpret_cast<unsigned char*>(_memoryBuffer.data);
   }

   char* getDataChar()
   {
     return reinterpret_cast<char*>(_memoryBuffer.data);
   }

   void* getData()
   {
     return _memoryBuffer.data;
   }

   const void* getData() const
   {
     return _memoryBuffer.data;
   }

   uint32_t getSize() const
   {
     return _memoryBuffer.size;
   }
};


class ScopedOrthancPluginImage
{
  OrthancPluginContext* _context;
  OrthancPluginImage* _image;

public:
    ScopedOrthancPluginImage(OrthancPluginContext* context, OrthancPluginImage* image)
      : _context(context),
        _image(image)
    {

    }
    ~ScopedOrthancPluginImage()
    {
      OrthancPluginFreeImage(_context, _image);
    }

   OrthancPluginImage* get()
   {
     return _image;
   }

   const void* getData()
   {
     return OrthancPluginGetImageBuffer(_context, _image);
   }

   const unsigned char* getDataUChar()
   {
     return reinterpret_cast<const unsigned char*>(OrthancPluginGetImageBuffer(_context, _image));
   }

   uint32_t getWidth()
   {
     return OrthancPluginGetImageWidth(_context, _image);
   }

   uint32_t getHeight()
   {
     return OrthancPluginGetImageHeight(_context, _image);
   }

   uint32_t getPitch()
   {
     return OrthancPluginGetImagePitch(_context, _image);
   }

   OrthancPluginPixelFormat getPixelFormat()
   {
      return OrthancPluginGetImagePixelFormat(_context, _image);
   }

};
