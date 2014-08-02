FROM dockerfile/ubuntu

MAINTAINER Johannes Wettinger, http://github.com/jojow



ENV ARTIFACT_MANAGER_DIR ${HOME}/artifactmgr

ADD build.sh build.sh

RUN bash build.sh



EXPOSE 8888

CMD [ "${ARTIFACT_MANAGER_DIR}/run.sh" ]
