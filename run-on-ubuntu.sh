#!/bin/sh

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $SCRIPTDIR

# Set env variable for OpenTOSCA:
#  export ARTIFACT_MANAGER_URL=http://localhost:8888/runs?reqTransformer=PlainConfigInput

# Get and start artifact manager:
#  curl -L https://raw.github.com/jojow/artifactmgr/master/run-on-ubuntu.sh | sudo bash

apt-get -y update
apt-get -y install git
git clone https://github.com/jojow/artifactmgr.git .

apt-get -y install python-software-properties python g++ make
add-apt-repository -y ppa:chris-lea/node.js
apt-get -y update
apt-get -y install nodejs

npm install

DEBUG="artifactmgr:*" npm start 2>&1 | tee -a artifactmgr.log
