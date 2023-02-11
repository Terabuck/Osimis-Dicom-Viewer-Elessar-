#!/bin/bash

set -x
set -e

previousDir=$(pwd)
srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"
cd ${srcRoot}

export TAG="latest-local"
export TEST_IMAGE="osimis/orthanc-webviewer-plugin.test"
export TEST_RUNNER_IMAGE="osimis/orthanc-webviewer-plugin.test-runner"

docker-compose -f ./tests/docker-compose.yml -p wv_test_latestlocal up

cd ${previousDir}