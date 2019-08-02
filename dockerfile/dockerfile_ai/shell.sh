#g++ -o /data/out/core /data/judge/core.cpp
########## compile #############
g++ -o /data/main /data/judge/main.cpp -Wall -lm --static -DONLINE_JUDGE
ret=$?
if [ $ret -ne 0 ] 
then
    echo 'Comple Error'
    exit 1 #CE
fi



filelist=`ls /data/judge | grep "\.cpp$"`
for file in $filelist
do
    g++ -o /data/${file%.*} /data/judge/$file -Wall -lm --static -DONLINE_JUDGE
    
    ret=$?
    if [ $ret -ne 0 ]
    then
        echo 'Comple Error in '$file
        exit 1 #CE
    fi
done

javac -cp .:/data/AI_judge.jar -d /data/ /data/judge/Main.java

cd /data/
java -cp .:/data/AI_judge.jar Games/Main

#java -jar /data/AI_judge.jar GoBang 10 10 /data/out/main /data/judge/ai

########## run #################
#./data/core $1 $2

#rm /data/out/core
#rm /data/out/main
#if [ -f '/data/out/spj' ]
#then
#    rm /data/out/spj
#fi

