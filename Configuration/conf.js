 
let SpecReporter = require('jasmine-spec-reporter').SpecReporter;
//var HtmlScreenshotReporter=require('protractor-jasmine2-screenshot-reporter');
var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
   
    directConnect : true,
  
   capabilities: {
    browserName: 'chrome',
    args: ['incognito',
    'start-fullscreen'
]
  },
  framework:'jasmine',
  
  specs: ['../Tests/*.js'], 

/*beforeLaunch: function() {
    return new Promise(function(resolve){
      reporter.beforeLaunch(resolve);
    });
  },*/  

onPrepare: async () => {
    //browser.driver.manage().window().maximize();
    await browser.waitForAngularEnabled(true);
    jasmine.getEnv().addReporter(new SpecReporter({
        displayFailuresSummary: true,
        displayFailuredSpec: true,
        displaySuiteNumber: true,
        displaySpecDuration: true,
        showstack: false
      }));
     
      // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
      jasmine.getEnv().addReporter(new HtmlReporter({
        baseDirectory: '../report/screenshots',
        preserveDirectory: false,
        screenshotsSubfolder: 'images',
         jsonsSubfolder:'jsons',
         docName: 'NCL-Report.html'
     }).getJasmine2Reporter());
  // Close the report after all tests finish
/*  afterLaunch: function(exitCode) {
    return new Promise(function(resolve){
      reporter.afterLaunch(resolve.bind(this, exitCode));
    });*/
},
    
     jasmineNodeOpts: {
        showColors: true, 
        defaultTimeoutInterval: 600000,    
        print: function() {}
        
}
};