#!/bin/bash
# builds orthanc JS/HTML from inside the frontend-builder container
set -e
set -x
cd /frontend
gulp build
# at this stage, the output files are in /frontend/build
mkdir -p /tmp/output
ZIP_PATH=/tmp/output/frontend-build.zip
mv /frontend/build /frontend/frontend-build/
cd /frontend
# make sure the zip will contain a directory frontend-build/
zip -r $ZIP_PATH frontend-build/