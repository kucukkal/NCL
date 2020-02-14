var NCLMainPage=function(){
    
this.el = element(by.xpath("(//a[@title='Ports'][contains(@href,'port-of-call')])[2]"));
//this.el=element(by.css('a[href*="port-of-call"]'))
this.el1=element(by.xpath("//input[@id='searchbar']"));
this.el2 = element(by.xpath("//a[@title='Honolulu, Oahu'][@style='text-transform: uppercase']"));
this.el3=element(by.xpath("(//li[@class='control-zoom-in'])[2]"));
this.el4=element(by.xpath("//*[@id='ports-map']/div/div/div[1]/div[3]/div/div[3]/div[450]/img"));
this.el5=element(by.xpath("//*[@id='ports-map']/div/div/div[1]/div[3]"));  
this.el6=element(by.xpath("//*[@id='ports-map']/div/div/div[1]/div[3]/div/div[3]/div[217]"));
this.el7=element(by.xpath("//*[@id='ports-map']/div/div/div[1]/div[3]/div/div[3]/div[450]/img"));
        

}
module.exports=new NCLMainPage();