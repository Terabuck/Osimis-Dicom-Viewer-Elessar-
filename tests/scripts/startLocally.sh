#!/bin/bash

# @description
# This script launch the web viewer tests.
# 
# @pre
# See `scripts/osx/InstallOsXDependencies.sh`. On linux, you must install a
# simular setup.
# 
# @param {boolean} [$1=true]
# Rebuild test environment.

set -x
set -e

rebuildTestEnv=${1:-true}

# Start from the repository root.
previousDir=$(pwd)
srcRoot="${REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}"
cd ${srcRoot}

# Open the test folder.
cd tests/osimis-test-runner/

# Create python environment.
if [ "$rebuildTestEnv" = true ]; then
    pyvenv env
fi

# Load python context.
. env/bin/activate

# Install python dep.
if [ "$rebuildTestEnv" = true ]; then
    pip install -r requirements.txt
fi

# Launch testes (w/ orthanc environment creation).
python3 osimis-test-runner.py -p ../../backend/build/

# Go back to previous dir.
cd ${previousDir}