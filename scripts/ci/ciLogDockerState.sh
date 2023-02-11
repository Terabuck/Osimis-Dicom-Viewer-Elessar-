#!/bin/bash

# cache docker state for future comparison
docker images | awk '{ print $1 $2 $3 $5 }' > "/tmp/wv-docker-images-${1}.txt"
docker ps -a | awk '{ print $1 $2 $3 $7 }'> "/tmp/wv-docker-ps-${1}.txt"
docker volume ls > "/tmp/wv-docker-volumes-${1}.txt"
docker network ls > "/tmp/wv-docker-networks-${1}.txt"
