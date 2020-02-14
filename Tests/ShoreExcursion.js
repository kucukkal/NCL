 
var Base  = require('../Utilities/Base.js');
var Excursion   =require("../Pages/Excursion.js");
var pgp          = require("pg-promise")(/*options*/);

describe("As a Guest", ()=>{
    
    
    it("As a Guest", ()=>{
        Base.navigateToSignIn();
        browser.manage().window().maximize();
      
    });
    it("I am on Homepage", ()=>{
    
    expect(browser.getCurrentUrl()).toEqual(Base.homeUrl);
    });

    it("I navigate to Shore Excursion page", ()=>{
            browser.executeScript('window.scrollTo(0,0);').then(function () {
            Excursion.el1.click();
            browser.refresh();
        });
        expect(browser.getCurrentUrl()).toEqual(Base.excur);
      
    });

    it("AND I click Find Excursions", ()=>{
        browser.executeScript("arguments[0].click();", Excursion.el4);
    } );
    it("AND Shore Excursions page is present", ()=>{
              
        expect(browser.getCurrentUrl()).toEqual(Base.excurSR);
       
     } );
    
    it("WHEN Price range is filtered to $0-$30", ()=>{
        
       // browser.sleep(10000);
       browser.executeScript('window.scrollTo(0,200);').then(function(){
        //then(async function () {
            var xs=0;
            var xf=0;
            var ys=0;
            var xd=0;    
            Excursion.el9.getSize().then(function(size){
                Excursion.el10.getLocation().then(function(location){
                    xd=(1-(30/2000))*size.width;                 
                    xf=location.x+xd;
                    xs=Math.round(xd-1);               
                    browser.actions().dragAndDrop(Excursion.el8,{x:-xs, y:0}).perform();
                });
            });
       
        });       
   } );   
   it("Given Port is displayed as Port of Departure", ()=>{
        Excursion.e1l1.getText().then(function(text){
           for(var i=0; i <text.length;i++){
             expect(parseFloat(text[i].substring(13,18))).toBeLessThanOrEqual(30.0);
            };
       });
    });
         

});
 