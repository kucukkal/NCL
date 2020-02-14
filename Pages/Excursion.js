var Excursion =function(){
   
    this.el = element(by.xpath("//*[@id='header']/section[3]/div/nav/div/div/div/div/div[1]/div/ul/li[2]/div/a"));    
    this.el1=element(by.xpath("//a[@title='Explore Shore Excursions -Title']"));
    this.el2=element(by.xpath("//*[@id='search_destinations_chosen']/a/span"));
    this.el3=element(by.xpath("//*[@id='search_destinations_chosen']/div/div/input"));
    this.el4=element(by.xpath("//*[@id='page-shore-excursions']/div/div[1]/div[2]/div/div/div[2]/div[2]/div/button"))
    this.el5=element(by.xpath("//*[@id='page-shore-excursions']/div/div[1]/div[2]/div/div/div[2]/div[2]/div/button"));  
    this.el5=element(by.xpath("//*[@id='sap-menu-left']/div/div[4]/ul[1]/li[2]/a"));
    this.el6=element.all(by.xpath("//ul[@id='ports']/li[*]/input[@type='checkbox']"));
    this.el6=element.all(by.xpath("//ul[@id='ports']"));
    this.el7=element(by.xpath("//*[@id='search_destinations_chosen']/div/ul/li"));
    this.el8=element(by.xpath("//*[@id='price-slider-values']/span[2]"))
    this.el9=element(by.xpath("//div[@id='price-slider-values']"));
    this.el10=element(by.xpath("//*[@id='price-slider-values']/span[1]"))
    this.e1l1=element.all(by.xpath("//ul[@class='price']")); 
    } 
    
    module.exports=new Excursion(); 