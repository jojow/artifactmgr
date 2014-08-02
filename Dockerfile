FROM dockerfile/ubuntu

MAINTAINER Johannes Wettinger, http://github.com/jojow



ENV ARTIFACT_MANAGER_DIR ${HOME}/artifactmgr
ENV DEBIAN_FRONTEND noninteractive

ADD install.sh /install.sh

RUN bash /install.sh && rm /install.sh



EXPOSE 8888

CMD ${ARTIFACT_MANAGER_DIR}/run.sh
