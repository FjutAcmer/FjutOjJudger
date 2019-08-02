FROM alpine:3.2
MAINTAINER syiml
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk update
RUN apk --update add gcc
RUN apk --update add g++

RUN apk --update add openjdk7-jre-base
RUN apk --update add openjdk7
RUN rm -rf /var/cache/apk/*
ENV JAVA_HOME /usr/lib/jvm/default-jvm
ENV PATH ${PATH}:${JAVA_HOME}/bin

RUN apk --update add python
RUN python -V


RUN mkdir -p /data/judge
ADD ./shell.sh /data/
RUN mkdir -p /data/out
RUN chmod 777 /data/shell.sh
ADD ./core.cpp /data/
RUN g++ -o /data/core /data/core.cpp
RUN mv /usr/include/sys /usr/include/sys_bf
RUN mv /usr/include/unistd.h /usr/include/unistd_bf.h
CMD ./data/shell.sh
