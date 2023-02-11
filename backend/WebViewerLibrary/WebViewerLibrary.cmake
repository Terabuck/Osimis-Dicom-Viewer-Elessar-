# Orthanc - A Lightweight, RESTful DICOM Store
# Copyright (C) 2012-2016 Sebastien Jodogne, Medical Physics
# Department, University Hospital of Liege, Belgium
# Copyright (C) 2016 OSIMIS SA
#
# This program is free software: you can redistribute it and/or
# modify it under the terms of the GNU Affero General Public License
# as published by the Free Software Foundation, either version 3 of
# the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.

# Create a WebViewerLibrary.a including all viewer dependencies
# and the core source code (without the plugin.cpp)
#
# Usage:
#   (within CMakeLists.txt)
#	  # Set all required variables
#   set(RESOURCES_DIR ${CMAKE_SOURCE_DIR}/Resources)
#   set(LOCAL_DEPENDENCIES_DIR ${CMAKE_SOURCE_DIR}/Dependencies)
#   set(VIEWER_LIBRARY_DIR ${CMAKE_SOURCE_DIR}/WebViewerLibrary)
#   # Build intermediate WebViewerLibrary
#   include(${VIEWER_LIBRARY_DIR}/WebViewerLibrary.cmake)
#   # target WebViewerLibrary is available


set(STATIC_BUILD ON CACHE BOOL "Static build of the third-party libraries (necessary for Windows)")
set(STANDALONE_BUILD ON CACHE BOOL "Standalone build (all the resources are embedded, necessary for releases)")
set(ALLOW_DOWNLOADS ON CACHE BOOL "Allow CMake to download packages")
set(ORTHANC_FRAMEWORK_SOURCE "hg" CACHE STRING "Source of the Orthanc source code (can be \"hg\", \"archive\", \"web\" or \"path\")")
set(ORTHANC_FRAMEWORK_ROOT "" CACHE STRING "Path to the Orthanc source directory, if ORTHANC_FRAMEWORK_SOURCE is \"path\"")

# Advanced parameters to fine-tune linking against system libraries
set(USE_SYSTEM_GDCM OFF CACHE BOOL "Use the system version of Grassroot DICOM (GDCM)")
set(USE_SYSTEM_ORTHANC_SDK OFF CACHE BOOL "Use the system version of the Orthanc plugin SDK")


# Download and setup the Orthanc framework
include(${CMAKE_SOURCE_DIR}/Resources/CMake/DownloadOrthancFramework.cmake)

set(ORTHANC_FRAMEWORK_PLUGIN ON)

include(${ORTHANC_ROOT}/Resources/CMake/OrthancFrameworkParameters.cmake)

set(ENABLE_LOCALE ON)
set(ENABLE_GOOGLE_TEST ON)
set(ENABLE_SQLITE ON)

include(${ORTHANC_ROOT}/Resources/CMake/OrthancFrameworkConfiguration.cmake)
include_directories(${ORTHANC_ROOT})

add_definitions(
  -DORTHANC_ENABLE_LOGGING_PLUGIN=1
  -DHAS_ORTHANC_EXCEPTION=0
  )

# create an intermediary WebViewerLibrary to avoid source recompilation
# for both unit tests and web viewer library
add_library(WebViewerLibrary
  STATIC

  ${ORTHANC_CORE_SOURCES}
  ${ORTHANC_ROOT}/Plugins/Samples/Common/OrthancPluginCppWrapper.cpp

  # The following files depend on GDCM
  ${VIEWER_LIBRARY_DIR}/SeriesInformationAdapter.cpp

  ${VIEWER_LIBRARY_DIR}/OrthancContextManager.cpp
  ${VIEWER_LIBRARY_DIR}/BaseController.cpp
  ${VIEWER_LIBRARY_DIR}/CustomCommand/CustomCommandController.cpp
  ${VIEWER_LIBRARY_DIR}/ShortTermCache/CacheIndex.h
  ${VIEWER_LIBRARY_DIR}/ShortTermCache/ICacheFactory.h
  ${VIEWER_LIBRARY_DIR}/ShortTermCache/IPrefetchPolicy.h
  ${VIEWER_LIBRARY_DIR}/ShortTermCache/CacheIndex.h
  ${VIEWER_LIBRARY_DIR}/ShortTermCache/CacheManager.cpp
  ${VIEWER_LIBRARY_DIR}/ShortTermCache/CacheContext.cpp
  ${VIEWER_LIBRARY_DIR}/ShortTermCache/CacheScheduler.cpp
  ${VIEWER_LIBRARY_DIR}/ShortTermCache/ViewerPrefetchPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Annotation/AnnotationRepository.cpp
  ${VIEWER_LIBRARY_DIR}/Study/StudyController.cpp
  ${VIEWER_LIBRARY_DIR}/Language/LanguageController.cpp
  ${VIEWER_LIBRARY_DIR}/Instance/DicomRepository.cpp
  ${VIEWER_LIBRARY_DIR}/Instance/InstanceRepository.cpp
  ${VIEWER_LIBRARY_DIR}/Series/SeriesFactory.cpp
  ${VIEWER_LIBRARY_DIR}/Series/SeriesHelpers.cpp
  ${VIEWER_LIBRARY_DIR}/Series/SeriesRepository.cpp
  ${VIEWER_LIBRARY_DIR}/Series/Series.cpp
  ${VIEWER_LIBRARY_DIR}/Series/SeriesController.cpp
  ${VIEWER_LIBRARY_DIR}/Image/AvailableQuality/OnTheFlyDownloadAvailableQualityPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/Utilities/KLVWriter.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageContainer/RawImageContainer.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageContainer/CompressedImageContainer.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageContainer/CornerstoneKLVContainer.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/CompositePolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/PixelDataQualityPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/HighQualityPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/MediumQualityPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/LowQualityPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/ResizePolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/Uint8ConversionPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/Monochrome1InversionPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/JpegConversionPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/PngConversionPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageProcessingPolicy/KLVEmbeddingPolicy.cpp
  ${VIEWER_LIBRARY_DIR}/Image/Image.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageMetaData.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageRepository.cpp
  ${VIEWER_LIBRARY_DIR}/Image/ImageController.cpp
  ${VIEWER_LIBRARY_DIR}/Config/WebViewerConfiguration.cpp
  ${VIEWER_LIBRARY_DIR}/Config/ConfigController.cpp

  ${VIEWER_LIBRARY_DIR}/BenchmarkHelper.cpp
  ${VIEWER_LIBRARY_DIR}/ViewerToolbox.cpp
  ${VIEWER_LIBRARY_DIR}/AbstractWebViewer.cpp
  )

target_include_directories(WebViewerLibrary PUBLIC ${VIEWER_LIBRARY_DIR}/)
target_include_directories(WebViewerLibrary PUBLIC ${BOOST_SOURCES_DIR})

# Enable image processing *generic* http routes on debug mode
if (CMAKE_BUILD_TYPE STREQUAL "Debug")
  target_compile_definitions(WebViewerLibrary PUBLIC -DPLUGIN_ENABLE_DEBUG_ROUTE=1)
endif()

target_compile_definitions(WebViewerLibrary PUBLIC -DORTHANC_SANDBOXED=0 -DORTHANC_DEFAULT_DICOM_ENCODING=Encoding_Latin1)

# bind WebViewerLibrary to WebViewerDependencies so any executable/library embedding
# WebViewerLibrary.a also embed WebViewerDependencies.
add_dependencies(WebViewerLibrary WebViewerDependencies)
target_link_libraries(WebViewerLibrary WebViewerDependencies)

# If using gcc, build WebViewerLibrary with the "-fPIC" argument to allow its
# embedding into the shared library containing the Orthanc plugin
if (${CMAKE_SYSTEM_NAME} STREQUAL "Linux" OR
    ${CMAKE_SYSTEM_NAME} STREQUAL "FreeBSD" OR
    ${CMAKE_SYSTEM_NAME} STREQUAL "kFreeBSD")
  get_target_property(Flags WebViewerLibrary COMPILE_FLAGS)
  if(Flags STREQUAL "Flags-NOTFOUND")
    SET(Flags "-fPIC -ldl -Wno-deprecated")
  else()
    SET(Flags "${Flags} -fPIC -Wno-deprecated")
  endif()
  set_target_properties(WebViewerLibrary PROPERTIES
      COMPILE_FLAGS ${Flags})
  target_link_libraries(WebViewerLibrary -ldl)
endif()
