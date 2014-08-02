#!/bin/bash

#
# Set environment variable for OpenTOSCA's operation invoker:
#  export ARTIFACT_MANAGER_URL=http://localhost:8888/runs?reqTransformer=PlainConfigInput
#

if [ -z "$ARTIFACT_MANAGER_DIR" ]; then
    ARTIFACT_MANAGER_DIR="$HOME/artifactmgr"
fi

NVM_DIR="$ARTIFACT_MANAGER_DIR/.nvm"



source $NVM_DIR/nvm.sh

cd $ARTIFACT_MANAGER_DIR

DEBUG="artifactmgr:*" forever -l forever.log -o out.log -e err.log server.js
#DEBUG="artifactmgr:*" npm start 2>&1 | tee -a $ARTIFACT_MANAGER_DIR/artifactmgr.log
