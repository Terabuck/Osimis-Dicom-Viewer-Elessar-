#!/bin/bash

set -x
set -e

cd frontend/

npm install karma-chai karma-chai-sinon karma-chrome-launcher karma-mocha karma-mocha-reporter karma-mocha-webworker karma karma-sinon sinon sinon-chai mocha --save-dev
bower update sinon --save-dev
npm outdated

cd ..
