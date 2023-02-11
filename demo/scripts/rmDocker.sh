#!/bin/bash
#
# Stop and remove running demo container. Also remove the docker image!
#
# @pre Execute `startDocker.sh`
#
# @param {string} $1 Tag of the docker image being stopped.
#                    Default: `osimis/orthanc:latest-local`

set -x
set -e

# $1 Name of the docker image
dockerImageName=${1:-"osimis/orthanc-wvb-demo:latest-local"}

# Stop & remove demo container
docker stop $(docker ps -a -q --filter ancestor=${dockerImageName}) || true
docker rm -v $(docker ps -a -q --filter ancestor=${dockerImageName}) || true

# Remove demo docker image
docker rmi ${dockerImageName} || true