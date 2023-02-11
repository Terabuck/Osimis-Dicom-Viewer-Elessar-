#!/bin/bash

set -x
set -e

srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"
reverseProxyRoot="${srcRoot}/reverse-proxy/"
dockerImageName="osimis/orthanc-webviewer-plugin/reverse-proxy:latest-local"

# Build osimis/orthanc-webviewer-plugin/reverse-proxy
docker build -t ${dockerImageName} ${reverseProxyRoot}
