# General config used for all the target and dependencies
# Make sure every add_definitions is present here since conditional add_definitions may prevent good cmake cache
# because this command impact every target related to the project (use target_compile_definitions whenever possible instead).
# Note the file BuildDependencies.cmake indirectly contains many add_definitions too.

# Parameters of the build
set(BENCHMARK OFF CACHE BOOL "Send benchmark informations to stdout")
set(STATIC_BUILD ON CACHE BOOL "Static build of the third-party libraries (necessary for Windows)")
set(ALLOW_DOWNLOADS ON CACHE BOOL "Allow CMake to download packages")
set(STANDALONE_BUILD ON CACHE BOOL "Standalone build (all the resources are embedded, necessary for releases)")

# Advanced parameters to fine-tune linking against system libraries
set(USE_SYSTEM_BOOST OFF CACHE BOOL "Use the system version of Boost")
set(USE_SYSTEM_GDCM OFF CACHE BOOL "Use the system version of Grassroot DICOM (GDCM)")
set(USE_SYSTEM_JSONCPP OFF CACHE BOOL "Use the system version of JsonCpp")
set(USE_SYSTEM_SQLITE OFF CACHE BOOL "Use the system version of SQLite")
set(USE_SYSTEM_ORTHANC_SDK OFF CACHE BOOL "Use the system version of the Orthanc plugin SDK")

## Use c++11
#include(CheckCXXCompilerFlag)
#CHECK_CXX_COMPILER_FLAG("-std=c++11" COMPILER_SUPPORTS_CXX11)
#CHECK_CXX_COMPILER_FLAG("-std=c++0x" COMPILER_SUPPORTS_CXX0X)
#if(COMPILER_SUPPORTS_CXX11)
#  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11")
#elseif(COMPILER_SUPPORTS_CXX0X)
#  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++0x")
#else()
#  message(STATUS "The compiler ${CMAKE_CXX_COMPILER} has no C++11 support. Please use a different C++ compiler.")
#endif()

# Remove policy CMP0042 warning on mac (set to default value)
if (${CMAKE_SYSTEM_NAME} STREQUAL "Darwin")
  set(CMAKE_MACOSX_RPATH 1)
endif()

# Add additional warning/error flags to Clang (for mac)
if (${CMAKE_CXX_COMPILER_ID} STREQUAL "Clang")
  set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall -Wno-long-long -Wno-implicit-function-declaration")  
  # --std=c99 makes libcurl not to compile
  # -pedantic gives a lot of warnings on OpenSSL 
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wno-long-long -Wno-variadic-macros")
endif()

# Make MSVC compatible with gtest
# https://code.google.com/p/googletest/issues/detail?id=412
if (MSVC) # VS2012 does not support tuples correctly yet
  add_definitions(/D _VARIADIC_MAX=10)
endif()

# speed up build
if(MSVC)
  add_definitions(/MP)
endif()

# Add headers required by boost chrono when benchmark are ON
if (BENCHMARK)
  add_definitions( 
    -DBENCHMARK=1
    )
  add_definitions( 
      -DBOOST_CHRONO_HEADER_ONLY
      #-DBOOST_ERROR_CODE_HEADER_ONLY
    )

  # Fix boost chrono to work on mac X.11
  if (${CMAKE_SYSTEM_NAME} STREQUAL "Darwin")
    add_definitions( 
      -D_DARWIN_C_SOURCE
    )
  endif()
endif()

if (${CMAKE_SYSTEM_NAME} STREQUAL "Linux" OR
    ${CMAKE_SYSTEM_NAME} STREQUAL "kFreeBSD" OR
    ${CMAKE_SYSTEM_NAME} STREQUAL "FreeBSD")
  link_libraries(rt)
endif()

if (APPLE)
  SET(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -framework CoreFoundation")
  SET(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -framework CoreFoundation")
endif()

# Help debug boost GIL templates
if (CMAKE_BUILD_TYPE STREQUAL "Debug")
  add_definitions(-DBOOST_GIL_USE_CONCEPT_CHECK=1)
endif()
