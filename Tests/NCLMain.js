var Base         =require('../Utilities/Base.js');
var NCLMainPage   =require("../Pages/NCLMainPage.js");
var pgp          = require("pg-promise")(/*options*/);

describe("As a Guest", ()=>{
    
    
    it("As a Guest", ()=>{
        Base.navigateToSignIn();
    });
    it("I am on Homepage", ()=>{
        var alert = browser.switchTo().alert().then(function(alert) {
            alert.dismiss();
        }, function(error) {
          try{
           
          }catch(error){
              console.log('sorun yok');
          }
        
        });
        /*var EC = protractor.ExpectedConditions;
browser.wait(EC.alertIsPresent(), 5000, "Alert is not getting present :(");
       */
       // browser.switchTo().alert().dismiss();
  expect(browser.getCurrentUrl()).toEqual(Base.homeUrl);
    });

    it("I navigate to Ports page", ()=>{
        browser.executeScript('window.scrollTo(0,0);').then(function () {
            NCLMainPage.el.click();
            browser.refresh();
        })
       expect(browser.getCurrentUrl()).toEqual(Base.portUrl);
    });

    it("When I search for Honolulu Port", ()=>{
        NCLMainPage.el1.sendKeys(Base.city);
        NCLMainPage.el2.click();
    } );
    it("Then Map zoomed to show selected Port", ()=>{
        browser.actions().mouseMove(NCLMainPage.el3).click().perform();
        } );
    it("Honolulu is in the middle of the map", ()=>{
       var lx=0;
       var ly=0;
       var px=0;
       var py=0;
       var w=0;
       var h=0;
       var fx=0;
       var fy=0;
       NCLMainPage.el4.getLocation().then(function (location) {
            lx=location.x;
            ly=location.y;
            NCLMainPage.el5.getSize().then(function (size) {
                w=size.width;
                h=size.height;
                NCLMainPage.el5.getLocation().then(function (location1) {
                    px=location1.x;
                    py=location1.y;
                    fx=px+w;
                    fy=py+h;
                    var fx2=fx/2;
                    var fy2=fy/2;
                    var PEx=Math.abs(100.0*(fx2-lx)/fx2);
                    var PEy=Math.abs(100.0*(fy2-ly)/fy2);
                    var EC = protractor.ExpectedConditions;
                    let condition=EC.and((PEx < 10),(PEy < 10));
                    expect(condition).toBeTruthy();          
                }); 
            });
        });
       
    });   
   it("Given Port is displayed as Port of Departure", ()=>{
        var dx=0;
        var dy=0;
        var avx=0;
        var avy=0;
        NCLMainPage.el6.getLocation().then(function (location) {
            console.log('Label of Honolulu is in the map');
            lx=location.x;
            ly=location.y;
            NCLMainPage.el7.getLocation().then(function (location1) {
                console.log('Port of departure label is found');
                console.log('checking if honolulu label is displayed together with port of departure label')
                lx1=location1.x;
                ly1=location1.y;
                dx=Math.abs(lx-lx1);
                dy=Math.abs(ly-ly1);
                avx=Math.abs((lx+lx1)/2);
                avy=Math.abs((ly+ly1)/2);
                var PEx1=100*dx/avx;
                var PEy1=100*dy/avy;
                var EC = protractor.ExpectedConditions;
                let condition=EC.and((PEx1 < 10),(PEy1 < 10));
                expect(condition).toBeTruthy();
            });
        });
    });
});
