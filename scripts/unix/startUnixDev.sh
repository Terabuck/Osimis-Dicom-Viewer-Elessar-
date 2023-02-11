#!/bin/bash

# @description
# This script builds the viewer plugin, launches orthanc with it, launches a 
# reverse proxy, and uses gulp to be able to change frontend files without 
# having to rebuild the backend.
# 
# The testable page is located at: `http://127.0.0.1:19966/`
# 
# @pre
# See `scripts/osx/InstallOsXDependencies.sh` and
# `scripts/unix/installAdditionalDevTools.sh`. On linux, you must install a
# simular setup.
# on JE OSX, launch ./scripts/unix/startUnixDev.sh false false
# on AM Ubuntu, launch Orthanc separately and launch./scripts/unix/startUnixDev.sh false false false true
# 
# @param {boolean} [$1=true]
# Reinstall frontend dependencies.
# 
# @param {boolean} [$1=true]
# Rebuild backend.
# 
# @param {boolean} [$1=false]
# Launches orthanc.
# 
# @param {boolean} [$1=false]
# Nginx needs sudo.

set -x
set -e

reinstallFrontendDep=${1:-true}
rebuildBackend=${2:-true}
launchOrthanc=${3:-false}
nginxNeedsSudo=${4:-false}

# Start from the repository root
previousDir=$(pwd)
rootDir="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"
cd ${rootDir}/

if [ "$reinstallFrontendDep" = true ]; then
    # install frontend local dependencies
    cd frontend/
    npm install
    lml npm install karma-firefox-launcher karma-growl-reporter\
        phantomjs-prebuilt karma-phantomjs-launcher karma-safari-launcher karma-slimerjs-launcher\
        karma-coverage plato jshint-stylish\
        gulp-jscs gulp-jshint\
        gulp-nodemon\
        https://registry.npmjs.org/http-proxy/-/http-proxy-1.13.2.tgz
    git checkout node_modules/gulp-injectInlineWorker/index.js
    bower install
    cd ../
fi
if [ "$rebuildBackend" = true ]; then
    # Build Frontend (req. by C++ plugin)
    cd frontend/
    git checkout node_modules/gulp-injectInlineWorker/index.js
    gulp build
    cd ../
    # Build plugin
    ./backend/scripts/buildLocally.sh
fi


# Run nginx
if [ "$nginxNeedsSudo" = true ]; then
    sudo nginx -p ${rootDir}/reverse-proxy/ -c nginx.local.conf
else
    nginx -p ${rootDir}/reverse-proxy/ -c nginx.local.conf
fi

# Run Frontend Dev Process
cd frontend/
git checkout node_modules/gulp-injectInlineWorker/index.js
gulp serve-dev &
gulpPid=$!
cd ../

if [ "$launchOrthanc" = true ]; then

  # Run Orthanc + Plugin
  cd ./backend/build/
  ./Orthanc configOSX.json &
  orthancPid=$!
  cd ../../

fi

# Kill orthanc, gulp & nginx on CTRL+C
if [ "$nginxNeedsSudo" = true ]; then
    trap "sudo nginx -p ${rootDir}/reverse-proxy/ -c nginx.local.conf -s stop; kill ${orthancPid}; kill ${gulpPid};" SIGINT ERR
else
    trap "nginx -p ${rootDir}/reverse-proxy/ -c nginx.local.conf -s stop; kill ${orthancPid}; kill ${gulpPid};" SIGINT ERR
fi
wait

# Return to the previous folder
cd previousDir
