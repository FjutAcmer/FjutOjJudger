import java.util.Scanner;
public class Main{
   public static void main(String[] args){
	   Scanner input=new Scanner(System.in);
	   while(2){
		   int a=input.nextInt(), b=input.nextInt();
		   if(a==0 && b==0)
			   break;
		   System.out.println(a+b);
	   }
   }
}