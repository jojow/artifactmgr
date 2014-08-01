#!/bin/sh

#
# Get and build artifact manager:
#  curl -L https://raw.github.com/jojow/artifactmgr/master/build-on-ubuntu.sh | sudo bash
#  wget -qO- https://raw.github.com/jojow/artifactmgr/master/build-on-ubuntu.sh | sudo bash
#

if [ -z "$ARTIFACT_MANAGER_DIR" ]; then
    ARTIFACT_MANAGER_DIR="~/artifactmgr"
fi

apt-get -y update && apt-get -y install git curl python-software-properties python g++ make

curl https://raw.githubusercontent.com/creationix/nvm/v0.12.2/install.sh | bash
~/.nvm/nvm.sh install 0.10
~/.nvm/nvm.sh use 0.10
~/.nvm/nvm.sh alias default 0.10

rm -rf $ARTIFACT_MANAGER_DIR
git clone https://github.com/jojow/artifactmgr.git $ARTIFACT_MANAGER_DIR

chmod a+x $ARTIFACT_MANAGER_DIR/run.sh

#
# Run artifact manager:
#  $ARTIFACT_MANAGER_DIR/run.sh
#
