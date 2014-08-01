#!/bin/bash

#
# Set environment variable for OpenTOSCA's operation invoker:
#  export ARTIFACT_MANAGER_URL=http://localhost:8888/runs?reqTransformer=PlainConfigInput
#

if [ -z "$ARTIFACT_MANAGER_DIR" ]; then
    ARTIFACT_MANAGER_DIR="$HOME/artifactmgr"
fi

if [ -z "$NVM_DIR" ]; then
    NVM_DIR="$HOME/.nvm"
fi



source $NVM_DIR/nvm.sh

cd $ARTIFACT_MANAGER_DIR

DEBUG="artifactmgr:*" npm start 2>&1 | tee -a $ARTIFACT_MANAGER_DIR/artifactmgr.log
