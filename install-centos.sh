# 更新 yum 的 INDEX
sudo yum update

## 安装 docker
# 安装 docker 前置包，centos7 默认有
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
# 配置 yum 添加 docker 代码仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
# 安装 docker
sudo yum install docker-ce
# 启动 docker
sudo systemctl start docker
# 开机启动 docker
sudo systemctl enable docker
# 查看 docker 版本，验证是否安装成功
docker version

# 下载 wget 包
sudo yum install -y wget
# 建立 app/software/ 并进入该目录下
mkdir /app
mkdir /app/software
cd /app/software
# 下载 nodejs v12.4.0 编译版本压缩包
wget https://nodejs.org/dist/v12.4.0/node-v12.4.0-linux-x64.tar.xz 
# 解压
tar xf  node-v12.4.0-linux-x64.tar.xz
# 进入目录
cd node-v12.4.0-linux-x64/    
# 测试node是否可用  
./bin/node -v 
cd ../
mv node-v12.4.0-linux-x64 nodejs
# 添加nodejs软连接，以供全局调用
ln -s /nodejs/bin/npm   /usr/bin/
ln -s /nodejs/bin/node	/usr/bin/

# 返回安装目录
cd /app/judge_system
# 安装docker内环境apline 3.2
docker pull alpine:3.2
# 建立docker容器
docker build -t judge dockerfile/