#!/bin/bash
# Clean the docker environment.
#
# pre-condition: setEnv.sh must be called

source .env
set -e # exit on error (and avoid recursive call to errorHandler in ciErrorHandler) - this should never happen during cleanup phase

echo "------------------------"
echo "Cleaning up..."

# remove test runner docker container if exists
echo "Cleaning $TEST_COMPOSE_PROJECT docker compose project"
docker-compose -f $TEST_COMPOSE_FILE -p $TEST_COMPOSE_PROJECT down --volumes > /dev/null

testedImage=${TEST_IMAGE}:${TAG}
dockerImage=$(docker images -q $testedImage 2> /dev/null)
if [[ $dockerImage != "" ]]; then
	echo "Cleaning $testedImage"
	docker rmi --no-prune $testedImage > /dev/null
fi

# do not remove related test-runner image (for cache purpose)
# testedImage=${TEST_RUNNER_IMAGE}

# cleanup osimis/orthanc-webviewer-plugin related images
dockerImage=$(docker images -q $MAIN_IMAGE:$TAG 2> /dev/null)
if [[ $dockerImage != "" ]]; then
	echo "Cleaning $MAIN_IMAGE:$TAG"
	docker rmi --no-prune $MAIN_IMAGE:$TAG > /dev/null
fi

dockerImage=$(docker images -q $MAIN_IMAGE:$COMMIT_ID 2> /dev/null)
if [[ $dockerImage != "" ]]; then
	echo "Cleaning $MAIN_IMAGE:$COMMIT_ID"
	docker rmi --no-prune $MAIN_IMAGE:$COMMIT_ID > /dev/null
fi

dockerImage=$(docker images -q $MAIN_IMAGE:$RELEASE_TAG 2> /dev/null)
if [[ $dockerImage != "" ]]; then
	echo "Cleaning $MAIN_IMAGE:$RELEASE_TAG"
	docker rmi --no-prune $MAIN_IMAGE:$RELEASE_TAG > /dev/null
fi

dockerImage=$(docker images -q $MAIN_IMAGE:latest 2> /dev/null)
if [[ $dockerImage != "" ]]; then
	echo "Cleaning $MAIN_IMAGE:latest"
	docker rmi --no-prune $MAIN_IMAGE:latest > /dev/null
fi

# remove aws docker containers if they exist
if [[ "${AWS_DOCKER_CONTAINER_ID}" != "" ]]; then
	dockerContainer=$(docker ps -a -q --no-trunc | grep ${AWS_DOCKER_CONTAINER_ID} 2> /dev/null)
	if [[ $dockerContainer != "" ]]; then
		echo "Cleaning $dockerContainer (AWS_DOCKER_CONTAINER_ID)"
		docker rm -v $dockerContainer > /dev/null
	fi
fi
if [[ "${AWS_DOCKER_CONTAINER2_ID}" != "" ]]; then
	dockerContainer=$(docker ps -a -q --no-trunc | grep ${AWS_DOCKER_CONTAINER2_ID} 2> /dev/null)
	if [[ $dockerContainer != "" ]]; then
		echo "Cleaning $dockerContainer (AWS_DOCKER_CONTAINER2_ID)"
		docker rm -v $dockerContainer > /dev/null
	fi
fi

# remove webapp builder docker container if exists
if [[ "${JS_BUILDER_CONTAINER_ID}" != "" ]]; then
	dockerContainer=$(docker ps -a -q --no-trunc | grep ${JS_BUILDER_CONTAINER_ID} 2> /dev/null)
	if [[ $dockerContainer != "" ]]; then
		echo "Cleaning $dockerContainer (JS_BUILDER_CONTAINER_ID)"
		docker rm -v $dockerContainer > /dev/null
	fi
fi

# remove any networks created for tests
docker network ls | grep -P '\w+\s+wv.?test' | awk '{print $2}' | xargs docker network rm || true

echo "...cleaned up"

echo "------------------------"
echo "Cleanup After Status:"

./scripts/ci/ciLogDockerState.sh postclean
echo "+ images"
diff --ignore-all-space /tmp/wv-docker-images-prebuild.txt /tmp/wv-docker-images-postclean.txt || true
echo "+ containers"
diff --ignore-all-space /tmp/wv-docker-ps-prebuild.txt /tmp/wv-docker-ps-postclean.txt || true
echo "+ volumes"
diff --ignore-all-space /tmp/wv-docker-volumes-prebuild.txt /tmp/wv-docker-volumes-postclean.txt || true
echo "+ networks"
diff --ignore-all-space /tmp/wv-docker-networks-prebuild.txt /tmp/wv-docker-networks-postclean.txt || true