#!/bin/bash

# @description
# This script start the whole web viewer demo using docker containers.
# 
# @pre
# Execute `./buildDocker.sh`
# 
# @env {number} [PORT=19966]
# The port used to display
#
# @env {string} [SUBNET=10.0.0.1/28]
# The port used to display

set -x
set -e

srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"

port=${PORT:-19966}
subnet=${SUBNET:-10.0.0.1/28}

# Launch demo w/ reverse proxy
PORT=$port SUBNET=$subnet docker-compose -f ${srcRoot}/docker-compose.yml -p wv_viewer up proxy
