## 请阅读README.md设置路径或者参考install-centos.sh中的命令
# 更新apt-get
apt-get update
# 安装 docker的io版本 
apt-get install docker.io
# 安装 node.js
apt-get install nodejs
#apt-get install subversion
# 拉取 alpine 3.2版本到docker中
docker pull alpine:3.2
# 创建 docker
docker build -t judge dockerfile/
