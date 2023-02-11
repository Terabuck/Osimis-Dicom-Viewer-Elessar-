#!/bin/bash
# Build and publish the LSB binary to AWS.
#
# pre-condition: setEnv.sh must be called

# handle errors
source .env
source $SRC_ROOT/scripts/ci/ciErrorHandler.sh

tagType=${1:-tagWithCommitId}  # before the code is validate, we don't wan't to push code with a branch name that could overwrite a valid one that is already on AWS server.  So, only push the commit id
if [[ $tagType == "tagWithReleaseTag" ]]; then
    awsLsbUrl=s3://orthanc.osimis.io/lsb/plugin-osimis-webviewer/releases/$RELEASE_TAG/
else
    awsLsbUrl=s3://orthanc.osimis.io/lsb/plugin-osimis-webviewer/commits/$COMMIT_ID/
fi


# build the LSB

cd $SRC_ROOT/backend/
docker build -t osimis/viewer-lsb-builder:$COMMIT_ID --build-arg JS_FRONTEND_VERSION=$COMMIT_ID --build-arg VIEWER_VERSION_FULL=$VIEWER_VERSION -f Dockerfile.lsb.builder .


# upload to AWS.  
# -------------

export AWS_ACCESS_KEY_ID      # export these 2 environment variables that are defined in Jenkins master config
export AWS_SECRET_ACCESS_KEY 
docker run --rm -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY osimis/viewer-lsb-builder:$COMMIT_ID s3 --region eu-west-1 cp /tmp/libOsimisWebViewer.so $awsLsbUrl

echo '------------------------'
echo 'File uploaded.'
echo 'File is downloadable at:'
echo $awsLsbUrl$libOsimisWebViewer'.so'
echo '------------------------'
