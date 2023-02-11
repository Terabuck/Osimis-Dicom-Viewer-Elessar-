#!/bin/bash

set -x
set -e

previousDir=$(pwd)
srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"
cd ${srcRoot}

# Execute `frontend/scripts/buildDocker.sh` (optional, since we'll use
# development source directly).
./frontend/scripts/buildDocker.sh ./frontend/build

# Execute `backend/scripts/buildDocker.sh`.
./backend/scripts/buildDocker.sh osimis/orthanc-webviewer-plugin:latest-local $(git describe --tags) ./frontend/build

# Create a webviewer docker image with the right configuration (~
# authentication disabled).
docker build -t osimis/orthanc-webviewer-plugin.test:latest-local -f ./tests/orthanc/Dockerfile ./tests/orthanc/

# Create a testing image with chrome & the dev source (karma, etc.).
docker build -t osimis/orthanc-webviewer-plugin.test-runner:latest-local -f ./DockerfileTestRunner .

cd ${previousDir}