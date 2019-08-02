FROM alpine
MAINTAINER syiml
RUN apk --update add gcc
RUN apk --update add g++
RUN apk --update add openjdk8-jre-base
RUN apk --update add openjdk8
RUN rm -rf /var/cache/apk/*
ENV JAVA_HOME /usr/lib/jvm/default-jvm
ENV PATH ${PATH}:${JAVA_HOME}/bin


RUN mkdir -p /data/judge
RUN mkdir -p /data/out
ADD ./shell.sh /data/
ADD ./AI_judge.jar /data/
RUN chmod 777 /data/shell.sh

#ADD ./core.cpp /data/
#RUN g++ -o /data/core /data/core.cpp
#RUN mv /usr/include/sys /usr/include/sys_bf
#RUN mv /usr/include/unistd.h /usr/include/unistd_bf.h
CMD ./data/shell.sh
