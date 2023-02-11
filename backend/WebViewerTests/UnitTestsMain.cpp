/**
 * Orthanc - A Lightweight, RESTful DICOM Store
 * Copyright (C) 2012-2016 Sebastien Jodogne, Medical Physics
 * Department, University Hospital of Liege, Belgium
 *
 * This program is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 **/

#include <gtest/gtest.h>

#include <json/writer.h> // for Json::Value
#include <Core/DicomFormat/DicomMap.h>
#include <Image/ImageMetaData.h>

static int argc_;
static char** argv_;

namespace {
  // class ImageMetaDataTest : public ::testing::Test {
  //  protected:
  //   virtual void SetUp() {
  //     // Set minimal required dicom fields for ImageMetaData to work
  //     dicomTags_["BitsStored"] = "16";
  //     dicomTags_["BitsAllocated"] = "12";
  //     dicomTags_["Columns"] = "1253";
  //     dicomTags_["Rows"] = "1531";
  //     dicomTags_["PhotometricInterpretation"] = "MONOCHROME1";
  //     dicomTags_["PixelRepresentation"] = "1";
  //   }

  //   virtual void TearDown() {

  //   }

  //   Orthanc::DicomMap headerTags_; // provide additional value (retrieved from dicom file) to the dicomTags(returned by orthanc sqlite)
  //   Json::Value dicomTags_;
  // };

  // TEST_F(ImageMetaDataTest, USR0507_U06_UT0601_MultipleWindowingDICOMTag) {
  //   // When WW/WC tags are multi-value integers
  //   dicomTags_["WindowCenter"] = "40\\450";
  //   dicomTags_["WindowWidth"] = "350\\1500";
  //   dicomTags_["WindowCenterWidthExplanation"] = "WINDOW1\\WINDOW2";
  //   // Process Tags
  //   ImageMetaData* a = new ImageMetaData(headerTags_, dicomTags_);
  //   // Expect the first provided ww/wc values to be processed
  //   EXPECT_EQ(a->windowCenter, 40.f);
  //   EXPECT_EQ(a->windowWidth, 350.f);
  //   delete a;
  // }

  // TEST_F(ImageMetaDataTest, USR0507_U06_UT0602_SingleWindowingDICOMTag) {
  //   // When WW/WC tags are single-value integer
  //   dicomTags_["WindowCenter"] = "436";
  //   dicomTags_["WindowWidth"] = "143";
  //   // Process Tags
  //   ImageMetaData* b = new ImageMetaData(headerTags_, dicomTags_);
  //   // Expect the parsing to work fine
  //   EXPECT_EQ(b->windowCenter, 436.f);
  //   EXPECT_EQ(b->windowWidth, 143.f);
  //   delete b;
  // }
}


int main(int argc, char **argv)
{
  argc_ = argc;
  argv_ = argv;  

  ::testing::InitGoogleTest(&argc, argv);

  return RUN_ALL_TESTS();
}
