#!/bin/bash
#
# @description
# Build the frontend using Docker, then store the built folder here:
# `frontend/build/`.
# 
# @pre
# Make sure `gulp serve-dev` is not active, as it could override the local
# build folder.
# 
# @param {string} [$1=${srcRoot}/frontend/build]
# The local path where the built frontend will be copied into.
# 
# @env {string) [TAG=latest-local]
# 
# @env {string) [JS_BUILDER_IMAGE=osimis/orthanc-webviewer-plugin/js-builder]
# 
# @env {string) [JS_BUILDER_CONTAINER=osimis-orthanc-webviewer-plugin-js-builder-${TAG}]
# 
set -x
set -e
srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"
outputDir=${1:-${srcRoot}/frontend/build}
tag=${TAG:-latest-local}
jsBuilderImage=${JS_BUILDER_IMAGE:-osimis/orthanc-webviewer-plugin/js-builder}
jsBuilderContainer=${JS_BUILDER_CONTAINER:-osimis-orthanc-webviewer-plugin-js-builder-${tag}}
# Remove previous build folder
rm -rf ${outputDir}
# Create builder image
docker build --tag=${jsBuilderImage} --file=${srcRoot}/frontend/DockerfileFrontEndBuilder ${srcRoot}/frontend/
# Create container before we can copy files to it
jsBuilderContainerId=$(docker create --name $jsBuilderContainer $jsBuilderImage)
export jsBuilderContainerId # export the variable so we can remove the container later
# Copy the frontend files in the container
docker cp $(pwd)/ ${jsBuilderContainerId}:/
# Build the frontend
docker start -a ${jsBuilderContainerId}
# Copy the build output folder to the host
docker cp ${jsBuilderContainerId}:/frontend/build/ ${outputDir}
# Remove container
docker rm -v ${jsBuilderContainerId} > /dev/null
