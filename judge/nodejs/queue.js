module.exports = {
    newQueue:function(){
        var stack1=[];
        var stack2=[];
        function push(node){
            stack1.push(node);
        }
        function pop(){
            if(size() == 0){
                return null;
            }
            if(stack2.length == 0){
                while(stack1.length>0){
                    stack2.push(stack1.pop());
                }
            }
            return stack2.pop();
        }
        function size(){
            return stack1.length+stack2.length;
        }
        return {
            push:push,
            pop:pop
        }
    }
};
