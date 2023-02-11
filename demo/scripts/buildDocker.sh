#!/bin/bash
#
# @pre
# builds a demo docker image with the WVB and sample images

set -x
set -e

# Define Dockerfile path
srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"
cd "${srcRoot}/demo/" # Make sure we're in the demo folder

source $srcRoot/.env

# instanciate a viewer-lsb-builder container to extract the wvb .so
mkdir -p binaries
export COMMIT_ID
wvbContainerId=$(docker create osimis/viewer-lsb-builder:$COMMIT_ID) 
docker cp --follow-link "$wvbContainerId:/tmp/libOsimisWebViewer.so" binaries/
docker rm $wvbContainerId

# Build demo docker image
docker rmi -f osimis/orthanc-wvb-demo:latest-local || true # @todo Use trap to clean image instead
docker build --no-cache -t osimis/orthanc-wvb-demo:latest-local .