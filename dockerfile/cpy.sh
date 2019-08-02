cp ../judge/judge/main.cpp ../judge_file/data/
cp ../judge/judge/main.cpp core.cpp

rm /app/T_TOJ/data/core.cpp 
mv ../judge_file/data/main.cpp /app/T_TOJ/data/core.cpp
docker build -t judge .

docker build -t judge_ai ./dockerfile_ai
