# 目录结构
```
+dockerfile
　　Dockerfile //生成docker的文件
　　shell.sh //docker启动时应该执行的脚本。docker中应该包含这个文件
+judge
　　+judge //判题核心程序
　　　　main.cpp //评测机核心代码
　　+nodejs //nodejs部分。处理oj和评测机的交互
　　　　config.json //nodejs的启动配置文件
　　　　hello.js //nodejs核心js文件
　　　　start.sh //启动nodejs的脚本
+judge_file
　　+data //保存每道题目的数据和特判程序
　　　　+1000 //题号1000
　　　　　　1.in
　　　　　　1.out //每组数据对应为xx.in和xx.out。文件名必须一致
　　　　　　spj.cpp //如果有则代表特判。
　　+run //运行docker的文件（判题时创建的临时输出文件）
　　　　+10000 //评测编号10000
　　　　　　+data //测试数据
　　　　　　+out //评测输出
　　　　　　　　1.user //1.in对应的输出文件
　　　　　　　　log //评测log
```
# 安装

将目录结构下的内容放于 /app/judge_system/ 下，或者更改 judge_system/judge/nodejs/config.json里面的path值
如果部署环境是Ubuntu16.x， 请运行 install-ubuntu.sh  
```
./install-ubuntu.sh
```
如果部署环境在CentOS7，请运行 install-centos.sh
```
./install-centos.sh
```


# 运行
```
用nodejs启动judge/nodejs/hello.js. Ubuntu16.x => ( nodejs judge/nodejs/hello.js ); CentOS 7 => ( node judge/nodejs/hello.js )
```
nodejs hello.js

