#!/bin/sh

#
# Get and build artifact manager:
#  curl -L https://raw.github.com/jojow/artifactmgr/master/build-on-ubuntu.sh | sudo bash
#  wget -qO- https://raw.github.com/jojow/artifactmgr/master/build-on-ubuntu.sh | sudo bash
#

if [ -z "$ARTIFACT_MANAGER_DIR" ]; then
    ARTIFACT_MANAGER_DIR="$HOME/artifactmgr"
fi

NVM_DIR="$HOME/.nvm"

apt-get -y update
apt-get -y install git curl python-software-properties python g++ make

git clone https://github.com/creationix/nvm.git $NVM_DIR

cd $NVM_DIR
git checkout tags/v0.12.2

source $NVM_DIR/nvm.sh

nvm install 0.10
nvm use 0.10
nvm alias default 0.10

rm -rf $ARTIFACT_MANAGER_DIR
git clone https://github.com/jojow/artifactmgr.git $ARTIFACT_MANAGER_DIR

chmod a+x $ARTIFACT_MANAGER_DIR/run.sh

#
# Run artifact manager:
#  $ARTIFACT_MANAGER_DIR/run.sh
#
