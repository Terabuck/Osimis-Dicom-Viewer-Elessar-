#!/bin/bash

# @description
# This script install all the development dependencies to develop with the web
# viewer on OSX without using docker.
# 
# - Homebrew
# - xCode CLI Tools
# - python3
# - Ruby (updated, w/ `rbenv` package manager)
# - Compass
# - NodeJS 6.10 (w/ `n` package manager)
# - Bower
# - Gulp
# - Nodemon
# - PhantomJS
# - Protractor (& selenium)
# - Karma
# - nginx
# - wget
# 
# It also download the latest OSX Orthanc zip, and extract it in the 
# `backend/build/` folder so you can test the built plugin straight from that
# folder.
# 
# @pre
# Install xcode using apple store
# 
# @warning
# You should not run this script directly but rather copy-paste the commands
# manually in the terminal. It is very likely you already have some of the
# installed binaries. As most of the things are installed in this script via
# homebrew, you may ends with duplicate installations.

# Install xcode CLI tools (ruby dependency)
xcode-select --install

# Install homebrew
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# Install python 3 (& pyvenv)
brew install python3

# Frontend:
#   Install Ruby
brew install rbenv ruby-build
echo 'if which rbenv > /dev/null; then eval "$(rbenv init -)"; fi' >> ~/.bash_profile
source ~/.bash_profile
rbenv install 2.4.0
rbenv global 2.4.0
ruby -v
#   Install Compass
gem update --system
gem install -n /usr/local/bin compass
#   Install node 6.10
curl -L https://git.io/n-install | bash
. ~/.bash_profile
n 6.10
#   Install frontend global dev dependencies
npm install -g bower gulp
npm install -g nodemon marked jsonlint jshint eslint jscs phantomjs protractor karma-cli
webdriver-manager update

# Proxy:
#   Install nginx
brew install nginx

# Backend:
#   Download/Copy orthanc
mkdir backend/build/ || true
cd backend/build/
brew install wget # Install wget
wget http://orthanc.osimis.io/osx/stable/orthancAndPluginsOSX.stable.zip
unzip orthancAndPluginsOSX.stable.zip
rm orthancAndPluginsOSX.stable.zip readme.txt libModalityWorklists.dylib libOrthancDicomWeb.dylib libOrthancPostgreSQLIndex.dylib libOrthancPostgreSQLStorage.dylib libOsimisWebViewer.dylib libServeFolders.dylib 
cd ../../
