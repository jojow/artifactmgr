#!/bin/sh

#
# Set env variable for OpenTOSCA's operation invoker:
#  export ARTIFACT_MANAGER_URL=http://localhost:8888/runs?reqTransformer=PlainConfigInput
#

if [ -z "$ARTIFACT_MANAGER_DIR" ]; then
    ARTIFACT_MANAGER_DIR="~/artifactmgr"
fi

cd $ARTIFACT_MANAGER_DIR

DEBUG="artifactmgr:*" npm start 2>&1 | tee -a $ARTIFACT_MANAGER_DIR/artifactmgr.log
