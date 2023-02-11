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

# Create a UnitTests executable testing the WebViewerLibrary.
#
# Usage:
#   (within CMakeLists.txt)
#   # Set all required variables
#   set(VIEWER_TESTS_DIR ${CMAKE_SOURCE_DIR}/WebViewerTests)
#   # Make sure WebViewerLibrary target is available (see `WebViewerLibrary/WebViewerLibrary.cmake`)
#   # Build unit tests
#   include(${WebViewerTests}/WebViewerTests.cmake)

# Create unit test executable
add_executable(UnitTests
  ${GOOGLE_TEST_SOURCES}

  ${VIEWER_TESTS_DIR}/UnitTestsMain.cpp
  )
add_dependencies(UnitTests WebViewerLibrary)
target_link_libraries(UnitTests WebViewerLibrary)
