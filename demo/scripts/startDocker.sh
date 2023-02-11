#!/bin/bash
# 
# Start docker image with the right volume
# 
# @pre Execute `buildDocker.sh`
# 
# @param {string} $1 Tag of the docker image being started.
#                    Default: `osimis/orthanc-webviewer-plugin:latest-local`
# 
# @param {int} $2 The port used for deployment. Port 20000-40000 are availables.
#                 Default: `8042`.
# 
# @param {string} $3 Name of the container launched.
#                    Default: `wv_demo_latest_local`
#                    - Required to start multiple demo containers on the same machine.
#                    - @warning If a container `wv_demo_latest_local` already exists, the previous
#                               container will be stopped and erased!
#                    - Useful to stop a chosen container later on.

set -x
set -e

# Define Dockerfile path
srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"
demoRoot="${srcRoot}/demo/"

# $1 Name of the docker image
dockerImageName=${1:-"osimis/orthanc-wvb-demo:latest-local"}

# $2 Port used for deployment
port=${2:-8042}

# $3 Deployed container name
demoContainer=${3:-"wv_demo_latest_local"}

# Configure the data volume
dataVolumeName=orthancSamplesDb2

# Stop previous demo using the same tag (if exists)
docker rm $(docker stop $(docker ps -a -q --filter name=${demoContainer} --format="{{.ID}}")) || true

# Launch demo
docker run -p ${port}:8042 -v ${dataVolumeName}:/orthancStorage --name ${demoContainer} -d ${dockerImageName}