FROM dockerfile/ubuntu

MAINTAINER Johannes Wettinger, http://github.com/jojow



ENV ARTIFACT_MANAGER_DIR ${HOME}/artifactmgr

ADD install.sh install.sh

RUN bash install.sh && rm install.sh



EXPOSE 8888

CMD [ "${ARTIFACT_MANAGER_DIR}/run.sh" ]
