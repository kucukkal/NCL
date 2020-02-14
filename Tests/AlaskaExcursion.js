
var Base         =require('../Utilities/Base.js');
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

    it("WHEN I search for destination Excursion Cruises", ()=>{
        Excursion.el2.click();
        Excursion.el3.sendKeys(Base.cruise);
        browser.refresh();
    });
    it("THEN Shore Excursions page is present", ()=>{
       
        Excursion.el2.click();
        Excursion.el3.sendKeys(Base.cruise);
        expect(browser.getCurrentUrl()).toEqual(Base.excur);
        browser.refresh();
    });
    it("AND Results are filtered by Excursion Cruises", ()=>{
       
        Excursion.el2.click();
        Excursion.el3.sendKeys(Base.cruise).then(async function(){
            await Excursion.el7.click().then(async function(){
                browser.executeScript("arguments[0].click();", Excursion.el4);
                expect(browser.getCurrentUrl()).toEqual(Base.SResultUrl);
            });
        });              
    });   
   it("AND Filter By Ports are only belong to Alaska, British Columbia", ()=>{
        Excursion.el5.click();
        Excursion.el6.each(function(element,index){
            var x=0;
            element.getText().then(function(text){
                if((text.indexOf("Alaska")!== -1) || (text.indexOf("British Columbia")!== -1)){
                    x=1;
                }
                expect(x).toEqual(1);
            });
        });

    });
      

});
 