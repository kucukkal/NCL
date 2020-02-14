var Base=function(){
    this.homeUrl = "https://www.ncl.com/";
    this.portUrl = "https://www.ncl.com/port-of-call";
    this.excur= "https://www.ncl.com/shore-excursions"
    this.city = "Honolulu";
    this.cruise = "Alaska Cruises";
    this.SResultUrl="https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises";
    this.excurSR="https://www.ncl.com/shore-excursions/search"
    this.deneme="https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+95";
    this.navigateToSignIn=function(){
       browser.get(this.homeUrl);
    };
}
module.exports=new Base();
