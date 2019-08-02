#include<stdio.h>
#include<stdio.h>
#include<stdlib.h>
#include<unistd.h>
#include<string.h>
#include<sys/wait.h>
#include<sys/resource.h>
#include<sys/ptrace.h>
#include<sys/types.h>  
#include<sys/stat.h>
#include<sys/time.h>
#include<sys/syscall.h>  
#include <sys/user.h>  
#include<dirent.h>
#include<algorithm>
#include<stack>
#include <stdarg.h>

#define BUFFER_SIZE 1024

#define RET_AC     0
#define RET_TLE    1
#define RET_MLE    2
#define RET_RE     3
#define RET_OLE    4
#define RET_WA     5
#define RET_PE     6
#define RET_ERROR  7
#define RET_SC     8

#define MAX_STACK_LIMIT 134217728 //128M

char readFile[50];
char outFile[50];
char writeFile[50];
int time_limit_s = 3;
int language = 1;
int memory_limit_MB = 100;

int time_use = 0;
int last_ret = RET_AC;

long outFileSize = 0;
FILE *log = NULL;
bool isSpj = false;
char log_str[300];
void LOG()
{
    log = fopen("/data/out/log","a+");
    fprintf(log,"%s\n",log_str);
    fclose(log);
}
void LOG(const char* format, ...)
{
    va_list v;
    va_start(v,format);
    log = fopen("/data/out/log","a+");
    fprintf(log,format,v);
    fclose(log);
    va_end(v);
}
long long getNowTime()
{
    struct timeval tv;
    gettimeofday(&tv,NULL);
    return ((unsigned long long)tv.tv_sec * 1000 + (unsigned long long)tv.tv_usec / 1000);
}
const char ret_text[][5] = {"AC","TLE","MLE","RE","OLE","WA","PE","ERR","SC"};
const char codeFileName[] = "/data/judge/main.cpp";
const char infoFileName[] = "/data/judge/submit.info";
const char dataFileName[] = "/data/judge/spj.data";
int limit(int resource,rlim_t rlim_cur,rlim_t rlim_max){
    struct rlimit limit;
    limit.rlim_cur = rlim_cur;
    limit.rlim_max = rlim_max;
    setrlimit(resource,&limit);
    return 0;
}
long get_file_size(const char * filename) {
    struct stat f_stat;

    if (stat(filename, &f_stat) == -1) {
        return 0;
    }

    return (long) f_stat.st_size;
}
int get_proc_status(int pid, const char * mark) {
    FILE * pf;
    char fn[BUFFER_SIZE], buf[BUFFER_SIZE];
    int ret = 0;
    sprintf(fn, "/proc/%d/status", pid);
    pf = fopen(fn, "r");
    int m = strlen(mark);
    while (pf && fgets(buf, BUFFER_SIZE - 1, pf)) {
        buf[strlen(buf) - 1] = 0;
        if (strncmp(buf, mark, m) == 0) {
            sscanf(buf + m + 1, "%d", &ret);
        }
    }
    if (pf)
        fclose(pf);
    return ret;
}
int get_page_fault_mem(struct rusage & ruse, const int pidApp) {  
    //java use pagefault  
    int m_vmpeak=0, m_vmdata=0, m_minflt=0;  
    m_minflt = ruse.ru_minflt*getpagesize(); 
    sprintf(log_str,"ruse.ru_minflt = %ld, pagesize=%d\n",ruse.ru_minflt,getpagesize());
    LOG();
    m_vmpeak = get_proc_status(pidApp, "VmPeak:");  
    m_vmdata = get_proc_status(pidApp, "VmData:");  
    sprintf(log_str,"!!!!VmPeak:%d KB VmData:%d KB minflt:%d KB\n", m_vmpeak, m_vmdata,m_minflt >> 10);  
    LOG();
    //return m_minflt>>10;  
    return m_vmpeak;
}  
char ret_output[10000] = {0};
int return_ans(int ret,int useTime,int useMemory,long long running_time,int score)
{
    char buff[1000] = {0};
    sprintf(buff,"[\"%s\",\"%s\",%d,%d,%lld,%d]",readFile+12,ret_text[ret],useTime,useMemory,running_time,score);
    strcat(ret_output,buff);
    sprintf(log_str,"[\"%s\",\"%s\",%d,%d,%lld,%d]\n",readFile+12,ret_text[ret],useTime,useMemory,running_time,score);
    LOG();
    time_use += useTime;
    last_ret = ret;
    
    sprintf(log_str,"end");
    LOG();
}
int return_ans(int ret,int useTime,int useMemory,long long running_time){
    char buff[1000] = {0};
    sprintf(buff,"[\"%s\",\"%s\",%d,%d,%lld]",readFile+12,ret_text[ret],useTime,useMemory,running_time);
    //printf("[\"%s\",\"%s\",%d,%d,%lld]",readFile+12,ret_text[ret],useTime,useMemory,running_time);
    strcat(ret_output,buff);
    sprintf(log_str,"[\"%s\",\"%s\",%d,%d,%lld]\n",readFile+12,ret_text[ret],useTime,useMemory,running_time);
    LOG();
    time_use += useTime;
    last_ret = ret;
    //exit(ret);
}
int top_memory = 0;
int judge(char *inFileName,char *outFileName,char *userFileName);
int judge_by_weiqi(char *inFileName,char *outFileName,char *userFileName);
int judgePE(char *inFileName,char *outFileName,char *userFileName);
void judge_spj(char *inFileName,char *outFileName,char *userFileName,long long run_time);
long long running_time = 0;
long long use_time = 0;
int check(const int pid){
    int status;
    struct rusage use;
    int waitpid_ret = wait4(pid,&status,WNOHANG,&use);//WNOHANG);  WUNTRACEED
    /*printf("WIFEXITED = %d\n",WIFEXITED(status));
    printf("WEXITSTATUS = %d\n",WEXITSTATUS(status));
    printf("WIFSIGNALED = %d\n",WIFSIGNALED(status));
    printf("WTERMSIG = %d\n",WTERMSIG(status));
    printf("waitpid_ret = %d\n",waitpid_ret);*/

    long long run_time = getNowTime() - running_time;

    if(waitpid_ret == 0)
    {
        int tempmemory;
        if(language==2){
            tempmemory = (get_page_fault_mem(use, pid));  
            tempmemory = 0;
        }else{
            tempmemory = get_proc_status(pid, "VmPeak:");
        }

        sprintf(log_str,"memory = %d  waitpid_ret=%d ,WIFEXITED(status)=%d\n",tempmemory,waitpid_ret,WIFEXITED(status));
        LOG();

        //printf("memory = %d KB\n",tempmemory);
        if(tempmemory > top_memory) top_memory = tempmemory;
        //printf("ret = %d\n",status);
        if(top_memory > memory_limit_MB * 1024){
            ptrace(PTRACE_KILL, pid, NULL, NULL);
            //printf("[ans = MLE memory = %d]\n",top_memory);
            return_ans(RET_MLE,use_time,top_memory,run_time);
            return 0;
        }


        if(get_file_size(writeFile) > outFileSize*2+1024){
            ptrace(PTRACE_KILL, pid, NULL, NULL);
            return_ans(RET_OLE,use_time,top_memory,run_time);
            return 0;
        }
        return 1;
    }
    use_time = use.ru_utime.tv_sec*1000+use.ru_utime.tv_usec/1000 + use.ru_stime.tv_sec*1000+use.ru_stime.tv_usec/1000;

    /*if(run_time >= time_limit_s*1000){
        ptrace(PTRACE_KILL, pid, NULL, NULL);
        //printf("[ans = MLE memory = %d]\n",top_memory);
        //return_ans(RET_TLE,now_time-running_time,top_memory);
        return_ans(RET_TLE,use_time,top_memory,run_time);
        return 0;
    }
*/
    if(WIFEXITED(status)){
        sprintf(log_str,"isSpj = %s\n",isSpj?"true":"false");
        LOG();
        if(isSpj){
            judge_spj(readFile,outFile,writeFile,run_time);
            sprintf(log_str,"spj DONE\n");
            LOG();
        }else{
            //return_ans(RET_NORMAL,use_time,top_memory);
            if(judge_by_weiqi(readFile,outFile,writeFile) == 0){
                LOG("1\n");
                return_ans(RET_AC,use_time,top_memory,run_time);
            }else if(judgePE(readFile,outFile,writeFile) == 0){
                LOG("2\n");
                return_ans(RET_PE,use_time,top_memory,run_time);
            }else{
                LOG("3\n");
                return_ans(RET_WA,use_time,top_memory,run_time);
            }
        }
        return 0;
    }

    if(WIFSIGNALED(status) != 0){ //have sign
        //printf("WTERMSIG(status) = %d\n",WTERMSIG(status));
        switch(WTERMSIG(status)){
            case SIGXCPU:{
                    sprintf(log_str,"[ans = TLE] =%d SIGXCPU\n",SIGXCPU);
                    LOG();
                    return_ans(RET_TLE,use_time,top_memory,run_time);
                    break;
                }
            case SIGKILL:{
                    sprintf(log_str,"[ans = TLE] =%d SIGKILL\n",SIGKILL);
                    LOG();
                    return_ans(RET_TLE,use_time,top_memory,run_time);
                    break;
                }
            case SIGXFSZ:{
                    sprintf(log_str,"[ans = OLE] =%d\n",SIGXFSZ);
                    LOG();
                    return_ans(RET_OLE,use_time,top_memory,run_time);
                    break;
                }
            default :{
                    sprintf(log_str,"[ans = RE] =%d\n",WTERMSIG(status));
                    LOG();
                    return_ans(RET_RE,use_time,top_memory,run_time);
                    break;
                }
        }
        return 0;
    }

    struct user_regs_struct reg;

    ptrace(PTRACE_GETREGS, pid, NULL, &reg); 
#ifdef __i386  
    sprintf(log_str,"syscall = %ld\n",reg.orig_eax);
#else  
    sprintf(log_str,"syscall = %ld\n",reg.orig_rax);
#endif
    LOG();
     
    //reg.REG_SYSCALL;
    ptrace(PTRACE_SYSCALL, pid, NULL, NULL);
    return 1;
    /*printf("ru_maxrss = %d\n",use.ru_maxrss);
    printf("ru_ixrss = %d\n",use.ru_ixrss);
    printf("ru_idrss = %d\n",use.ru_idrss);
    printf("ru_isrss = %d\n",use.ru_isrss);*/
}
char readNext(FILE* f,char* except){
    char c;
    while(1){
        if(fscanf(f,"%c",&c)==EOF){
            return EOF;
        }
        int i;
        for(i=0;except[i];i++){
            if(c == except[i]) break;
        }
        if(!except[i]){
            break;
        }
    }
    return c;
}
int judgePE(char *inFileName,char *outFileName,char *userFileName){
    LOG("6\n");
    //FILE* inFile = fopen(inFileName,"r");
    FILE* outFile = fopen(outFileName,"r");
    FILE* userFIle = fopen(userFileName,"r");
    char c1,c2;
    while(1){
        c1 = readNext(outFile,(char*)"\r\n ");
        c2 = readNext(userFIle,(char*)"\r\n ");
        if(c1 != c2) return 1;
        if(c1 == EOF || c2 == EOF) break;
    }
    fclose(outFile);
    fclose(userFIle);
    return 0;
}

int judge(char *inFileName,char *outFileName,char *userFileName){
    //FILE* inFile = fopen(inFileName,"r");
    FILE* outFile = fopen(outFileName,"r");
    FILE* userFIle = fopen(userFileName,"r");
    char c1,c2;
    while(1){
        c1 = readNext(outFile,(char*)"\r");
        c2 = readNext(userFIle,(char*)"\r");
        if(c1 != c2) return 1;
        if(c1 == EOF || c2 == EOF) break;
    }
    fclose(outFile);
    fclose(userFIle);
    return 0;
}

int judge_by_weiqi(char *inFileName,char *outFileName,char *userFileName)
{
    LOG("5\n");
    //FILE* inFile=fopen(inFileName,"r");
    FILE* outFile=fopen(outFileName,"r");
    FILE* userFile=fopen(userFileName,"r");
    char c1,c2;
    int f1=1,f2=1;
    std::stack<char>s1,s2;
    int line = 0;
    if(outFile ==NULL || userFile==NULL){LOG("5.01\n");}
    LOG("5.1 %d %d %d %d\n",outFile,outFileName,userFile,userFileName);
    while(1)
    {
        if(f1!=EOF)
        while((f1=fscanf(outFile,"%c",&c1))!=EOF)
        {
            if(c1=='\n')
                break;
            if(c1!='\r')
                s1.push(c1);
        }
        if(f2!=EOF)
        while((f2=fscanf(userFile,"%c",&c2))!=EOF)
        {
            if(c2=='\n')
                break;
            if(c2!='\r')
                s2.push(c2);
        }
        line ++;
    LOG("5.2 - line %d\n",line);
        while(!s1.empty()&&s1.top()==' ')
            s1.pop();
        while(!s2.empty()&&s2.top()==' ')
            s2.pop();
        while(!s1.empty()&&!s2.empty())
        {
            if(s1.top()!=s2.top()) 
            {
                sprintf(log_str,"WA in line %d\n",line);
                LOG();
    fclose(outFile);
    fclose(userFile);
                return 1;
            }
            s1.pop();s2.pop();
        }
        if(!s1.empty()||!s2.empty())
        {
    fclose(outFile);
    fclose(userFile);
    LOG("5.3\n");
            return 1;
        }
        if(f1==EOF&&f2==EOF)break;
    }
    fclose(outFile);
    fclose(userFile);
    return 0;
}
void judge_spj(char *inFileName,char *outFileName,char *userFileName,long long run_time){
    char s[1000];
    s[0]=0;
    sprintf(s,"/data/out/spj %s %s %s %s %s %s",inFileName,outFileName,userFileName,codeFileName,infoFileName,dataFileName);
    int r = system(s);
    sprintf(log_str,"r=%x\n",r);
    LOG();
    int ret = (r>>8) & 0xff;
    sprintf(log_str,"r=%x ret=%d\n",r,ret);
    LOG();
    if(ret & 0x80)//积分
    {
        return_ans(RET_SC,use_time,top_memory,run_time,ret & 0x7f);
        sprintf(log_str,"return ans\n");
        LOG();
    }else{
        if(ret == 0 ){
            return_ans(RET_AC,use_time,top_memory,run_time);
        }else{
            return_ans(RET_WA,use_time,top_memory,run_time);
        }
    }
    sprintf(log_str,"return ans2\n");
    LOG();
}
int main(int argc,char* argv[]){
    //read argc
    //input_file,output_file,user_file,time_limit,memory_limit
    /*printf("argc: %d\n",argc);
    for(int i=0;i<argc;i++)
    {
        printf("argv~[%d] : %s\n",i,argv[i]);
    }*/
    /*read argv*/
    /*readFile = argv[1];
    outFile = argv[2];
    writeFile = argv[3];*/
    sscanf(argv[1],"%d",&time_limit_s);
    sscanf(argv[2],"%d",&memory_limit_MB);
    sscanf(argv[3],"%d",&language);
    int true_time_limit_s = time_limit_s;
    DIR *dir_spj = opendir("/data/judge/");
    struct dirent *ptr;
    isSpj = false;
    while((ptr = readdir(dir_spj))!=NULL)
    {
        if(strcmp( ptr->d_name , "spj.cpp") == 0){
            isSpj = true;
            break;
        }
    }
    /*
     * get the file list
     * */
    DIR *dir;
    dir = opendir("/data/judge/");
    while((ptr = readdir(dir))!=NULL){
        int nameLen = strlen(ptr->d_name);
        if(nameLen <= 2) continue;
        if(strcmp(ptr->d_name + (nameLen-3),".in")!=0) continue;
        sprintf(log_str,"BEGIN 1\n");
        LOG();
        strcpy(readFile,"/data/judge/");
        strcat(readFile,ptr->d_name);
        strcpy(outFile,readFile);  
        strcpy(outFile+(strlen(readFile)-3),".out");
        strcpy(writeFile,"/data/out/");
        strcat(writeFile,ptr->d_name);
        strcpy(writeFile+(strlen(writeFile)-3),".user");
        sprintf(log_str,"BEGIN 2\n");
        LOG();


        pid_t t = fork();
        if(t>0){
            //if(log == NULL) log = fopen("/data/out/log","w");
            sprintf(log_str,"->%s time_limit=%d use=%d\n",ptr->d_name,true_time_limit_s*1000,time_use);
            LOG();
            running_time = getNowTime();
            use_time = 0;
            int while_flag = 1;
            outFileSize = get_file_size(outFile);
            while(while_flag){
                while_flag = check(t);
            }
            sprintf(log_str,"DONE0\n");
            LOG();
            //printf("DONE\n");
        }else{
//            ptrace(PTRACE_TRACEME, 0, NULL, NULL);  
            limit(RLIMIT_CPU,true_time_limit_s,true_time_limit_s);
            //limit(RLIMIT_AS,1*1024*1024,10*1024*1024);
    
            //limit(RLIMIT_STACK,std::min(MAX_STACK_LIMIT,memory_limit_MB*1024),std::min(MAX_STACK_LIMIT,memory_limit_MB*1024));
    
            limit(RLIMIT_CORE,0,0);
            //limit(RLIMIT_NPROC,1,1);
            //limit(RLIMIT_FSIZE,0,0);
    
            freopen(readFile,"r",stdin);
            freopen(writeFile,"w",stdout);
            
             
            //limit(RLIMIT_NOFILE,0,0);
            switch(language){
                case 2://java
                    execl("/usr/bin/java","/usr/bin/java","Main",(char*)NULL);
                    break;
                case 3://python
                    execl("/usr/bin/python","python","/data/judge/main.py",(char*)NULL);
                    break;
                default:
                    execl("/data/out/main","./main",(char*)NULL);
            }
            //execl("/data/judge/go.sh","./go.sh",readFile,writeFile,(char*)NULL);
            //printf("ret:%d\n",ret);
            perror("judge_error:");
            exit(RET_RE);
        }
        sprintf(log_str,"DONE2\n");
        LOG();
        if(t==0) break; 
        if(last_ret != RET_AC && last_ret!= RET_SC){
            break;
        }
        if(time_use > time_limit_s * 1000) break;
        true_time_limit_s = time_limit_s - time_use/1000;
        if(true_time_limit_s <= 0)  true_time_limit_s = 1;
        sprintf(log_str,"DONE2\n");
        LOG();
    }
    printf("%s\n",ret_output);
    return 0;
}
