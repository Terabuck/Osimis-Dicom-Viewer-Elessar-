# This configure and build all dependencies (including some copied orthanc files)
# Note that the include_directories command affects and is meant for every targets (including those outside of this .cmake file)

## Build dependencies

include(CheckIncludeFiles)
include(CheckIncludeFileCXX)
include(CheckLibraryExists)
include(FindPythonInterp)

set(ENABLE_PLUGINS_VERSION_SCRIPT OFF)

include(${ORTHANC_ROOT}/Resources/CMake/Compiler.cmake)
include(${RESOURCES_DIR}/CMake/GdcmConfiguration.cmake)
include(${ORTHANC_ROOT}/Resources/CMake/GoogleTestConfiguration.cmake)

## Check that the Orthanc SDK headers are available or download them
if (STATIC_BUILD OR NOT USE_SYSTEM_ORTHANC_SDK)
  include_directories(${CMAKE_SOURCE_DIR}/Orthanc/Sdk-1.3.1)
else ()
  CHECK_INCLUDE_FILE_CXX(orthanc/OrthancCPlugin.h HAVE_ORTHANC_H)
  if (NOT HAVE_ORTHANC_H)
    message(FATAL_ERROR "Please install the headers of the Orthanc plugins SDK")
  endif()
endif()

## Build dependencies which are not already considered as external libs (everything else from GCDM, cf. boost, JsonCpp and SQLite)
add_library(WebViewerDependencies
  STATIC

  # The following files depend on GDCM
  ${ORTHANC_ROOT}/Plugins/Samples/GdcmDecoder/GdcmImageDecoder.cpp
  ${ORTHANC_ROOT}/Plugins/Samples/GdcmDecoder/GdcmDecoderCache.cpp
  ${ORTHANC_ROOT}/Plugins/Samples/GdcmDecoder/OrthancImageWrapper.cpp
)

# bind WebViewerDependencies to GDCM so any executable/library embedding
# WebViewerDependencies.a also embed GDCM.
if (STATIC_BUILD OR NOT USE_SYSTEM_GDCM)
  add_dependencies(WebViewerDependencies GDCM)
endif()
target_link_libraries(WebViewerDependencies ${GDCM_LIBRARIES})

# If using gcc, build WebViewerDependencies with the "-fPIC" argument to allow its
# embedding into the shared library containing the Orthanc plugin
if (${CMAKE_SYSTEM_NAME} STREQUAL "Linux" OR
    ${CMAKE_SYSTEM_NAME} STREQUAL "FreeBSD" OR
    ${CMAKE_SYSTEM_NAME} STREQUAL "kFreeBSD")
  get_target_property(Flags WebViewerDependencies COMPILE_FLAGS)
  if(Flags STREQUAL "Flags-NOTFOUND")
    SET(Flags "-fPIC -ldl")
  else()
    SET(Flags "${Flags} -fPIC")
  endif()
  set_target_properties(WebViewerDependencies PROPERTIES
      COMPILE_FLAGS ${Flags})
  target_link_libraries(WebViewerDependencies -ldl)
endif()
