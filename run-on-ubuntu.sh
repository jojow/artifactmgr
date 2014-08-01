#!/bin/sh

SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $SCRIPTDIR

# Set env variable for OpenTOSCA's operation invoker:
#  export ARTIFACT_MANAGER_URL=http://localhost:8888/runs?reqTransformer=PlainConfigInput

# Get and start artifact manager:
#  curl -L https://raw.github.com/jojow/artifactmgr/master/run-on-ubuntu.sh | sudo bash
#  wget -qO- https://raw.github.com/jojow/artifactmgr/master/run-on-ubuntu.sh | sudo bash

apt-get -y update && apt-get -y install git curl python-software-properties python g++ make

curl https://raw.githubusercontent.com/creationix/nvm/v0.12.2/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 0.10
nvm use 0.10
nvm alias default 0.10

rm -rf ~/artifactmgr
git clone https://github.com/jojow/artifactmgr.git ~/artifactmgr

cd ~/artifactmgr

npm install

DEBUG="artifactmgr:*" npm start 2>&1 | tee -a artifactmgr.log
