#!/bin/bash

# @description
# This script builds the whole web viewer demo using only docker. See
# `./startDocker.sh` to start the docker containers.
# 
# @pre
# Install docker.
# 
# @pre
# Set environment variables (see below).
# 
# @pre
# Make sure `gulp serve-dev` is not active.
# 
# @env {string} AWS_ACCESS_KEY_ID
# AWS credential ID.
# 
# @env {string} AWS_SECRET_ACCESS_KEY
# AWS credential KEY.
# 
# @env {number} [PORT=19966]
# The port used to display
#
# @env {string} [SUBNET=10.0.0.1/28]
# The port used to display
# 
# @param {boolean} [$1=true]
# Sync demo DICOM data with AWS (takes some time. most of the time, cache is
# enough).

set -x
set -e

srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"

port=${PORT:-19966}
subnet=${SUBNET:-10.0.0.1/28}

# Execute `frontend/scripts/buildDocker.sh`
./frontend/scripts/buildDocker.sh ./frontend/build

# Execute `backend/scripts/buildDocker.sh`
./backend/scripts/buildDocker.sh osimis/orthanc-webviewer-plugin:latest-local $(git describe --tags) ./frontend/build

# Execute `demo/scripts/buildDocker.sh`
./demo/scripts/buildDocker.sh osimis/orthanc-webviewer-plugin:latest-local ${1:-true}

# Execute `reverse-proxy/buildDocker.sh`
./reverse-proxy/buildDocker.sh

# Build demo w/ reverse proxy
PORT=$port SUBNET=$subnet docker-compose -f ${srcRoot}/docker-compose.yml -p wv_viewer build proxy