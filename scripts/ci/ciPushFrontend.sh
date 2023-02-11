#!/bin/bash
# Publish the front-end on AWS.
#
# pre-condition: setEnv.sh must be called

# handle errors
source .env
source $SRC_ROOT/scripts/ci/ciErrorHandler.sh

tagType=${1:-tagWithCommitId}  # before the code is validate, we don't wan't to push code with a branch name that could overwrite a valid one that is already on AWS server.  So, only push the commit id
if [[ $tagType == "tagWithReleaseTag" ]]; then
    zipFileToUpload=$RELEASE_TAG
else
    zipFileToUpload=$COMMIT_ID
fi

# upload to AWS.  
# -------------

# we first need to create the container before we can copy files to it
export AWS_ACCESS_KEY_ID      # export these 2 environment variables that are defined in Jenkins master config
export AWS_SECRET_ACCESS_KEY 
export zipFileToUpload
AWS_DOCKER_CONTAINER_ID=$(docker create -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY anigeo/awscli s3 --region eu-west-1 cp /tmp/$zipFileToUpload.zip $AWS_URL)
export AWS_DOCKER_CONTAINER_ID # export container_id so we can cleanup latter

# copy the zip from the host to the AWS container
tmpPwd=$(pwd)
cd $SRC_ROOT/frontend/
docker cp $COMMIT_ID.zip ${AWS_DOCKER_CONTAINER_ID}:/tmp/$zipFileToUpload.zip

# move back to the previous folder
cd $tmpPwd

# upload
docker start -a ${AWS_DOCKER_CONTAINER_ID}

# remove container
docker rm -v ${AWS_DOCKER_CONTAINER_ID} > /dev/null

echo '------------------------'
echo 'File uploaded.'
echo 'File is downloadable at:'
echo $AWS_URL$zipFileToUpload'.zip'
echo '------------------------'
