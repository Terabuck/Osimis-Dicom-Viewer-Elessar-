#!/bin/bash
# prerequisites: sudo apt-get install -y python3-venv
set -x #to debug the script
set -e #to exit the script at the first failure

branchName=$1
viewerVersion=$2 # git describe --tags --long --dirty=-dirty
action=$3

startScriptDir=$(pwd)
export PATH=$PATH:/usr/local/bin   #such that pyvenv works
cd ../..

#create a python virtual environment
source scripts/ci/createPythonVenv.sh
source env/bin/activate

cd $startScriptDir/
pip install -r requirements.txt
pip install awscli

#display all SDKs supports by this version of xcode
xcodebuild -showsdks

python3 buildWindowsOSX.py $branchName $viewerVersion $action

cd $startScriptDir
deactivate
