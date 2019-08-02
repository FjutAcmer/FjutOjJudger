var url = require('url');
var http = require("http");
var path = require('path');
var fs = require('fs');
var child_process = require('child_process');
var qs = require('querystring');  
var queue = require('./queue');

var config = JSON.parse(fs.readFileSync('./config.json'));
debug(JSON.stringify(config));

var req_queue = queue.newQueue();
var req_queue_game = queue.newQueue();
var req_queue_general = queue.newQueue();
var is_work = false;
var is_work_game = false;
var is_work_general = false;
var util = require('util');  

http.createServer(function(request, response) {
    response.writeHead(200, {
            "Content-Type" : "text/html" // 输出类型
    });
    var postData = "";
    request.addListener("data",function(postDataChunk){
        postData += postDataChunk;
    });
    request.addListener("end",function(){
        //log("=>request(post): "+postDataChunk);
        var req = qs.parse(postData);
        //var req = url.parse(reques, true).query;
        //var req = postDataChunk;
        log("=>request(post): "+JSON.stringify(req));
        switch(req.type)
        {
            case "submit": //{type:"submit",pid,rid,code,timelimit,memorylimit}
            {
                response.write("{\"ret\":\"success\"}");
                onSubmit(response,req);
                break;
            }
            case "getResult"://{type:"getREsult",rid}
            {
                getResult(response,req);
                break;
            }
            case "general":
            {
				onSubmit(response,req);
				break;
            }
        }
        response.end();
    });
}).listen(config.port); // 监听端口号
debug("nodejs start listen "+config.port+" port!");

var judge_result = {};
function getResult(response,req){
    //debug("function getResult: rid="+req.rid);
    if(judge_result[req.rid]){
        response.write("{\"ret\":\"success\",\"result\":"+JSON.stringify(judge_result[req.rid])+"}");
        //debug("1~{\"ret\":\"success\",\"result\":"+JSON.stringify(judge_result[req.rid])+"}");
    }else{
        response.write("{\"ret\":\"noSubmit\"}");
        //debug("2~{\"ret\":\"noSubmit\"}");
    }
}
function onSubmit(response,req){
    //response.write("submit success");
    debug("function submit: rid="+req.rid);
    judge_result[req.rid] = {type:"padding"};
    if(req.type =="general"){
        if(is_work_general){
            req_queue_general.push(req);
        }else{
            general(req.rid,req.input,req.code,req.timelimit,req.memorylimit);
        }
    }else{
        fs.exists(config.path+"/data/"+req.pid+"/config.json",function(exists){
            if(exists){
                if(is_work_game){
                    req_queue_game.push(req);
                }else{
                    judge_ai(req.pid,req.rid,req.code);
                }
    
            }else{
                if(is_work){
                    req_queue.push(req);
                }else{
                    judge(req.pid,req.rid,req.language,req.code,req.timelimit,req.memorylimit,req.judge_data);
                }
            }
        });
    }
}
function judge_ready(pid,rid,code,isGame,rollback){
    log("=====================judge:rid("+rid+")==========================");
    if(isGame)   is_work_game = true;
    else is_work = true;
    judge_result[rid] = {type:"judging"};
    var mkdirURL_pid = config.path+config.run_name+"/"+rid;
    try{
        fs.mkdirSync(mkdirURL_pid);
    }catch(err){}
    var mkdirURL = mkdirURL_pid+"/data";
    try{
        fs.mkdirSync(mkdirURL);
    }catch(err){}
    var mkdirURL_out = mkdirURL_pid+"/out";
    try{
        fs.mkdirSync(mkdirURL_out);
    }catch(err){}

    var files = fs.readdirSync(mkdirURL);//读取该文件夹
    files.forEach(function(file){
        var stats = fs.statSync(mkdirURL+'/'+file);
        if(stats.isDirectory()){
            emptyDir(mkdirURL+'/'+file);
        }else{
            fs.unlinkSync(mkdirURL+'/'+file);
        }
    });
    var files = fs.readdirSync(mkdirURL_out);//读取该文件夹
    files.forEach(function(file){
        var stats = fs.statSync(mkdirURL_out+'/'+file);
        if(stats.isDirectory()){
            emptyDir(mkdirURL_out+'/'+file);
        }else{
            fs.unlinkSync(mkdirURL_out+'/'+file);
        }
    });
    var writerStret = fs.createWriteStream(mkdirURL+'/main.cpp');
    writerStret.write(code,"UTF-8");
    writerStret.end();
    //copy data
    child_process.exec("cp "+config.path+"/data/"+pid+"/* "+config.path+"/data/core.cpp "+mkdirURL,rollback);
}
function judge_ai(pid,rid,code){
    var mkdirURL_pid = config.path+config.run_name+"/"+rid;
    var mkdirURL = mkdirURL_pid+"/data";
    var mkdirURL_out = mkdirURL_pid+"/out";
    judge_ready(pid,rid,code,true,function(){
        var docker_containers_name = "judge_ai";
        var dockerCmd = "docker run "+
                        "--cpuset-cpus=1 "+
                        //"-m 512m "+
                        "-v "+mkdirURL+":/data/judge:ro "+
                        "-v "+mkdirURL_out+":/data/out "+
                        "--name="+docker_containers_name+
                        " judge_ai /bin/sh /data/shell.sh";
        debug("dockerCmd = "+dockerCmd);
        var docker_process_isEnd = false;
        var is_time_out = false;
        child_process.exec("docker rm -f "+docker_containers_name,function(){
            var begin_time = Date.now();
            var docker_process = child_process.exec(dockerCmd,function(e,stdout,stderr){
                if(e != null) debug("docker e->"+e);
                if(stdout != null && stdout != "") debug("docker stdout->"+stdout);
                if(stderr != null && stderr != "") debug("docker stderr->"+stderr);
                var ans ;
                if(stdout.indexOf('Comple Error') == 0){
                    ans = {type:"CE",info:stderr};
                }else{
                    try{
                        ans = eval("("+stdout+")");
                        ans['game'] = true;
                        ans['time'] = Date.now()-begin_time;
                    }catch(err){
                        if(is_time_out){
                            ans = {type:"TLE",time:Date.now()-begin_time};
                        }else{
                            ans = {type:"ERROR",info:stderr};
                        }
                    }
                }
                //log("final result = "+JSON.stringify(ans));
                docker_process_isEnd = true;
                clearTimeout(timeout);
                onJudgeDone(pid,rid,JSON.stringify(ans),true);
                    
            });
        });
        var timeout = setTimeout(function(){
            debug( 600000  + " ms   kill   docker_process_isEnd="+docker_process_isEnd);
            if(!docker_process_isEnd){
                child_process.exec("docker kill "+docker_containers_name);
                is_time_out = true;
            }
        },600000); 
    });
}
function onJudgeDone(pid,rid,result,isGame){
    log("=======================judge done============================ pid="+pid+"&rid="+rid+"&result="+result);
    judge_result[rid] = result;
/*    var req = http.request({
            hostname : config.oj_path,
            port : config.oj_port,
            path : '/judgeSystemReturn.action',
            method: "POST",
            headers: {  
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'  
                }  
            }, function (res) {
            console.log('STATUS: ' + res.statusCode);  
            console.log('HEADERS: ' + JSON.stringify(res.headers));  
            res.setEncoding('utf8');  
            res.on('data', function (chunk) {  
                console.log('BODY: ' + chunk);
            });
            //fs.appendFile('debug',process.memoryUsage().heapUsed+"\n");
*/
    if(pid==0){
        var req = req_queue_general.pop();
        if(req!=null){
            general(req.rid,req.input,req.code,req.timelimit,req.memorylimit);
        }else{
            is_work_general = false;
        }
    }
    if(isGame){
            var req = req_queue_game.pop();
            if(req!=null){
                judge_ai(req.pid,req.rid,req.code);
            }
            else{
                is_work_game = false;
            }
    }else{
            var data = req_queue.pop();
            if(data != null){
                //req_queue.push(data);
                judge(data.pid,data.rid,data.language,data.code,data.timelimit,data.memorylimit,data.judge_data);
                //chooseJudge(data);
            }else {
                is_work = false;
            }
    }
/*
        }
    );
    req.write(qs.stringify({pid:pid,rid:rid,result:result}));
    req.end();*/
}
function general(id,input,code,timelimit,memorylimit)
{
    is_work_general = true;
    log("====================general======================================");
    is_work = true;
    judge_result[id] = {type:"judging"};
    var mkdirURL_pid = config.path+config.run_name+"/"+id;
    try{
        fs.mkdirSync(mkdirURL_pid);
    }catch(err){}
    var mkdirURL = mkdirURL_pid+"/data";
    try{
        fs.mkdirSync(mkdirURL);
    }catch(err){}
    var mkdirURL_out = mkdirURL_pid+"/out";
    try{
        fs.mkdirSync(mkdirURL_out);
    }catch(err){}

	var files = fs.readdirSync(mkdirURL);//读取该文件夹
	files.forEach(function(file){
	    var stats = fs.statSync(mkdirURL+'/'+file);
	    if(stats.isDirectory()){
	        emptyDir(mkdirURL+'/'+file);
	    }else{
	        fs.unlinkSync(mkdirURL+'/'+file);
        	//console.log("删除文件"+mkdirURL+'/'+file+"成功");
    	}
	});
	
	var files = fs.readdirSync(mkdirURL_out);//读取该文件夹
    files.forEach(function(file){
        var stats = fs.statSync(mkdirURL_out+'/'+file);
        if(stats.isDirectory()){
            emptyDir(mkdirURL_out+'/'+file);
        }else{
            fs.unlinkSync(mkdirURL_out+'/'+file);
            //console.log("删除文件"+mkdirURL_out+'/'+file+"成功");
        }
    });
    //if(language == 1)
    {
        var writerStret = fs.createWriteStream(mkdirURL+'/main.cpp');
        writerStret.write(code,"UTF-8");
        writerStret.end();
    }
	
	writerStret = fs.createWriteStream(mkdirURL+'/1.in');
    writerStret.write(input,"UTF-8");
    writerStret.end();

    writerStret = fs.createWriteStream(mkdirURL+'/1.out');
    writerStret.write("","UTF-8");
    writerStret.end();

    child_process.exec("cp "+config.path+"/data/core.cpp "+mkdirURL,function(e){
        //console.log("cp->"+e);
        //console.log("copy data end");
        var docker_containers_name = "judge";
        var dockerCmd = "docker run "+
                        "--cpuset-cpus="+config.cpuset+" "+
                        //"-m 512m "+
                        "-v "+mkdirURL+":/data/judge:ro "+
                        "-v "+mkdirURL_out+":/data/out "+
                        "--name="+docker_containers_name+
                        " judge /bin/sh /data/shell.sh "+parseInt((parseInt(timelimit)+999)/1000)+" "+memorylimit+" 1";
        debug("dockerCmd = "+dockerCmd);
        var docker_process_isEnd = false;

        child_process.exec("docker rm -f "+docker_containers_name,function(){
            var docker_process = child_process.exec(dockerCmd,function(e,stdout,stderr){
                if(e != null) debug("docker e->"+e);
                if(stdout != null && stdout != "") debug("docker stdout->"+stdout);
                if(stderr != null && stderr != "") debug("docker stderr->"+stderr);
                var ans ;
                if(stdout.indexOf('Comple Error') == 0){
                    ans = {type:"CE",info:stderr};
                }else{
                    ans = "{'type':'success','ret':[";
                    for(var i=0 ;i<stdout.length;i++){
                        ans = ans + stdout[i];
                        if(stdout[i] == ']' && i!=stdout.length-1){
                            ans=ans+",";
                        }
                    }
                    ans = ans +"]}";
                    ans = eval('('+ans+')');
                }
                //if(stderr != null && stderr!="") debug("docker stderr->"+stderr);

                log("final result = "+JSON.stringify(ans));
                docker_process_isEnd = true;
                clearTimeout(timeout);
                try{
    				ans.info = fs.readFileSync(mkdirURL_out+"/1.user","utf-8");
                }catch (e){
                    ans.info = "";
                }
                onJudgeDone(0,id,JSON.stringify(ans));
            });
        });
        var timeout = setTimeout(function(){
            debug((timelimit/1000+1)*5000+2000  + " ms   kill   docker_process_isEnd="+docker_process_isEnd);
            if(!docker_process_isEnd){
                child_process.exec("docker kill "+docker_containers_name);
            }
        },(timelimit/1000+1)*5000 + 2000);
    });
}
function readFile(file){  
    fs.readFile(file, function(err, data){  
        if(err)  
            console.log("读取文件fail " + err);  
        else{  
            // 读取成功时  
            // 输出字节数组  
            console.log(data);  
            // 把数组转换为gbk中文  
            var str = iconv.decode(data, 'gbk');  
            console.log(str);  
        }  
    });  
}  
function judge(pid,rid,language,code,timelimit,memorylimit,judge_data){
    log("=====================judge:rid("+rid+")==========================");
    is_work = true;
    judge_data = eval("("+judge_data+")");
    //svn up
//    child_process.exec("svn up",{cwd: config.path+"/data/"}, function(){

    judge_result[rid] = {type:"judging"};
    
    var mkdirURL_pid = config.path+config.run_name+"/"+rid;
    try{
    //if (!fs.existsSync(mkdirURL_pid)) {
        fs.mkdirSync(mkdirURL_pid);
    }catch(err){}

    var mkdirURL = mkdirURL_pid+"/data";
    //if (!fs.existsSync(mkdirURL)) {
    try{
        fs.mkdirSync(mkdirURL);
    }catch(err){}

    var mkdirURL_out = mkdirURL_pid+"/out";
    //if (!fs.existsSync(mkdirURL_out)) {
    try{
        fs.mkdirSync(mkdirURL_out);
    }catch(err){}
    //}

    var files = fs.readdirSync(mkdirURL);//读取该文件夹
    files.forEach(function(file){
        var stats = fs.statSync(mkdirURL+'/'+file);
        if(stats.isDirectory()){
            emptyDir(mkdirURL+'/'+file);
        }else{
            fs.unlinkSync(mkdirURL+'/'+file);
            //console.log("删除文件"+mkdirURL+'/'+file+"成功");
        }
    });
    
    var files = fs.readdirSync(mkdirURL_out);//读取该文件夹
    files.forEach(function(file){
        var stats = fs.statSync(mkdirURL_out+'/'+file);
        if(stats.isDirectory()){
            emptyDir(mkdirURL_out+'/'+file);
        }else{
            fs.unlinkSync(mkdirURL_out+'/'+file);
            //console.log("删除文件"+mkdirURL_out+'/'+file+"成功");
        }
    });
    
    var file_name = "main.cpp";
    if(language == 2){
        file_name = "Main.java";
    }else if(language == 3)
    {
        file_name = "main.py";
    }
    var writerStret = fs.createWriteStream(mkdirURL+'/'+file_name);
    writerStret.write(code,"UTF-8");
    writerStret.end();

    //写提交信息 格式：//可以加，主要是要给特判程序用（如果有需要的话）
    //用户名
    //rid
    //pid
    var writerStret2 = fs.createWriteStream(mkdirURL+'/submit.info');
    try{
    writerStret2.write(judge_data.username+"\n","UTF-8");
    }catch(e){}
    writerStret2.end();

    //copy data
    child_process.exec("cp "+config.path+"/data/"+pid+"/* "+config.path+"/data/core.cpp "+mkdirURL,function(e){
        fs.exists(mkdirURL+"/init.sh",function(exists){
            if(exists){
                var parentDir = path.resolve(mkdirURL);
                child_process.exec("bash init.sh",{cwd:parentDir},go());
            }else{
                go();
            }
        });
    });
    function go(){
        //console.log("cp->"+e);
        //console.log("copy data end");
        var docker_containers_name = "judge";
        var dockerCmd = "docker run "+
                        "--cpuset-cpus="+config.cpuset+" "+
                        //"-m 512m "+
                        "-v "+mkdirURL+":/data/judge:ro "+
                        "-v "+mkdirURL_out+":/data/out "+
                        "--name="+docker_containers_name+
                        " judge /bin/sh /data/shell.sh "+parseInt((parseInt(timelimit)+999)/1000)+" "+memorylimit+" "+language;
        debug("dockerCmd = "+dockerCmd);
        var docker_process_isEnd = false;

        child_process.exec("docker rm -f "+docker_containers_name,function(){
            var docker_process = child_process.exec(dockerCmd,function(e,stdout,stderr){
                if(e != null) debug("docker e->"+e);
                if(stdout != null && stdout != "") 
                    debug("docker stdout->"+stdout);
		        if(stderr != null && stderr != "") debug("docker stderr->"+stderr);
                var ans ;
                if(stdout.indexOf('Comple Error') == 0){
                    ans = {type:"CE",info:stderr};
                }else{
                    ans = "{'type':'success','ret':[";
                    for(var i=0 ;i<stdout.length;i++){
                        ans = ans + stdout[i]; 
                        if(stdout[i] == ']' && i!=stdout.length-1){
                            ans=ans+",";
                        }
                    }
                    ans = ans +"]}";
                    ans = eval('('+ans+')');
                }
                //if(stderr != null && stderr!="") debug("docker stderr->"+stderr);
    
                //log("final result = "+JSON.stringify(ans));
                docker_process_isEnd = true;
                clearTimeout(timeout);
                fs.exists(mkdirURL_out+"/spj.data",function(exists){
                    if(exists){
                        child_process.exec("cp "+mkdirURL_out+"/spj.data "+config.path+"/data/"+pid+"/",function(){
                            onJudgeDone(pid,rid,JSON.stringify(ans),false);
                        }); 
                    }else{
                        onJudgeDone(pid,rid,JSON.stringify(ans),false);
                    }
                });
            });
        });
        var timeout = setTimeout(function(){
            debug((timelimit/1000+1)*5000+2000  + " ms   kill   docker_process_isEnd="+docker_process_isEnd);
            if(!docker_process_isEnd){
                child_process.exec("docker kill "+docker_containers_name);
            }
        },(timelimit/1000+1)*5000 + 2000);
    }
//    });
}

//{type:"submit",rid:"123",code:"XXXXXX",timelimit:"1000",memorylimti:"128"};
//{type:"submit",rid:"123",code:"XXXXXX",game:"GoBang"}
//{type:"getResult",rid:"123"};
//{type:"getCEInfo",rid:"123"};
//docker run -it -v /home/syiml/task/judge_file/run/111:/data/judge judge_docker

function debug(info){
    console.log("\033[34m["+new Date().toLocaleTimeString()+"]\033[0m"+info);
}
function log(info){
    console.log("\033[33m["+new Date().toLocaleTimeString()+"]\033[0m"+info);
}
