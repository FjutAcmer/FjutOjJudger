#g++ -o /data/out/core /data/judge/core.cpp
########## compile #############
if [ $3 -eq 2 ] 
then #java
    javac -d /data/out/ -J-Xms32m -J-Xmx256m /data/judge/Main.java
elif [ $3 -eq 3 ]
then #python
    python -c "import py_compile;py_compile.compile(r'/data/judge/main.py',r'/data/out/main.pyc')"
else
    g++ -o /data/out/main /data/judge/main.cpp -Wall -lm --static -DONLINE_JUDGE -std=gnu++11
fi

ret=$?
if [ $ret -ne 0 ]
then
    echo 'Comple Error'
    exit 1 #CE
fi

if [ -f '/data/judge/spj.cpp' ]
then
    g++ -o /data/out/spj /data/judge/spj.cpp -Wall -lm --static -std=gnu++11
    chmod 755 /data/out/spj
fi


########## run #################
cd /data/out/
/data/core $1 $2 $3

#rm /data/out/core
rm /data/out/main
if [ -f '/data/out/spj' ]
then
    rm /data/out/spj
fi

