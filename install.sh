#!/bin/bash

#
# Get and build artifact manager:
#  curl -L https://raw.github.com/jojow/artifactmgr/master/install.sh | bash
#  wget -qO- https://raw.github.com/jojow/artifactmgr/master/install.sh | bash
#

set -e

sys_has() {
    type "$1" > /dev/null 2>&1
    return $?
}

if [ -z "$ARTIFACT_MANAGER_DIR" ]; then
    ARTIFACT_MANAGER_DIR="$HOME/artifactmgr"
fi

NVM_DIR="$ARTIFACT_MANAGER_DIR/.nvm"



if sys_has "apt-get"; then
    sudo apt-get -y update
    sudo apt-get -y install curl git python-software-properties python g++ make
elif sys_has "yum"; then
    sudo yum -y install curl git-core
fi

if ! sys_has "curl"; then
    echo "FAIL: curl is not installed"
    exit 1
fi

if ! sys_has "git"; then
    echo "FAIL: git is not installed"
    exit 1
fi

rm -rf $ARTIFACT_MANAGER_DIR
git clone https://github.com/jojow/artifactmgr.git $ARTIFACT_MANAGER_DIR

rm -rf $NVM_DIR
git clone https://github.com/creationix/nvm.git $NVM_DIR
cd $NVM_DIR
git checkout tags/v0.24.0

source $NVM_DIR/nvm.sh

nvm install 0.10
nvm use 0.10
nvm alias default 0.10

npm install -g forever

cd $ARTIFACT_MANAGER_DIR

npm install

chmod a+x run.sh

echo "INFO: run artifact manager by invoking $ARTIFACT_MANAGER_DIR/run.sh"

#
# Run artifact manager:
#  $ARTIFACT_MANAGER_DIR/run.sh
#
