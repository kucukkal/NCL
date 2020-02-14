var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "As a Guest|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ 0 The value \"device-320\" for key \"width\" is invalid, and has been ignored.",
                "timestamp": 1581618824478,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #signup-fiel-email: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618827572,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #your-email-address: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618827572,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618829280,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Amsterdam, Netherlands: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829528,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Athens (Piraeus), Greece: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829528,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Auckland, New Zealand: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829528,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Barcelona, Spain: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829529,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Boston, Massachusetts: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829529,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Buenos Aires, Argentina: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829529,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Cape Town, South Africa: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829530,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Copenhagen, Denmark: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829530,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Dubai, United Arab Emirates: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829530,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Hong Kong, China: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829532,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Honolulu, Oahu: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829534,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Lisbon, Portugal: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829534,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #London (Southampton), England: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829535,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Los Angeles, California: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829535,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Miami, Florida: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829535,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #New Orleans, Louisiana: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829536,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #New York, New York: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829536,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Orlando & Beaches (Port Canaveral): (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829536,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Papeete, Tahiti, French Polynesia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829536,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Port Kembla, Australia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829537,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Québec City, Québec: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829537,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Rome (Civitavecchia), Italy: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #San Diego, California: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #San Juan, Puerto Rico: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Santiago (San Antonio), Chile: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Seattle, Washington: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Seward, Alaska: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Singapore, Singapore: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Sydney, Australia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Tampa, Florida: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Vancouver, British Columbia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829539,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Venice, Italy: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618829539,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618830893,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618830909,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://contextweb.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618832019,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://bh.contextweb.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618832019,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618833094,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618833476,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at https://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618833477,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618834888,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://twitter.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618839137,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at https://d.la3-c2-ia2.salesforceliveagent.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618840955,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618840955,
                "type": ""
            }
        ],
        "screenShotFile": "images\\009400b5-000c-00e8-0003-00ea002d00b3.png",
        "timestamp": 1581618818158,
        "duration": 22877
    },
    {
        "description": "I am on Homepage|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "images\\00b30011-00b7-00e9-009a-00f000ec0049.png",
        "timestamp": 1581618843469,
        "duration": 60
    },
    {
        "description": "I navigate to Shore Excursion page|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618860792,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618861280,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618861361,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618861558,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618861560,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://contextweb.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618861839,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://bh.contextweb.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618861839,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a resource at http://rundsp.com/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618861841,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618884282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.ncl.com/static/scripts/ncl.shorex.scripts.js?v=1581430494068 41:647 Uncaught TypeError: Cannot read property '$on' of undefined",
                "timestamp": 1581618886060,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618886190,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618886190,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618888109,
                "type": ""
            }
        ],
        "screenShotFile": "images\\004b001e-00b1-002c-00ac-00fb00c90099.png",
        "timestamp": 1581618845451,
        "duration": 43132
    },
    {
        "description": "WHEN I search for destination Excursion Cruises|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.ncl.com/static/scripts/ncl.shorex.scripts.js?v=1581430494068 41:647 Uncaught TypeError: Cannot read property '$on' of undefined",
                "timestamp": 1581618891673,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618891751,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618891751,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s.go-mpulse.net/boomerang/TCZKH-A3E5K-R7UEE-8AYTU-FWV9Y 15:23872 ",
                "timestamp": 1581618903785,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618903913,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00360065-0026-00ed-0019-00fa00810015.png",
        "timestamp": 1581618890040,
        "duration": 14090
    },
    {
        "description": "THEN Shore Excursions page is present|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.ncl.com/static/scripts/ncl.shorex.scripts.js?v=1581430494068 41:647 Uncaught TypeError: Cannot read property '$on' of undefined",
                "timestamp": 1581618907256,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618907710,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618907710,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618907790,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00ef0079-00d3-00be-002d-0025007e00ed.png",
        "timestamp": 1581618905467,
        "duration": 2538
    },
    {
        "description": "AND Results are filtered by Excursion Cruises|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618914431,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618914451,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618916002,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618916026,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618916767,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at https://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618916770,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618916770,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618918965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://force.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618919671,
                "type": ""
            }
        ],
        "screenShotFile": "images\\002f003d-00d6-00dc-00a9-00a4000700f8.png",
        "timestamp": 1581618909611,
        "duration": 11214
    },
    {
        "description": "AND Filter By Ports are only belong to Alaska, British Columbia|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "images\\00fe005e-005a-00e0-00a4-004100050009.png",
        "timestamp": 1581618921921,
        "duration": 553
    },
    {
        "description": "As a Guest|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618953964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618953964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618953964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618953964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618953964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at https://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618953964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618953964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618953964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?destination=Alaska+Cruises - A cookie associated with a cross-site resource at http://force.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618953964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ 0 The value \"device-320\" for key \"width\" is invalid, and has been ignored.",
                "timestamp": 1581618954020,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Amsterdam, Netherlands: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955760,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Athens (Piraeus), Greece: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955842,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Auckland, New Zealand: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955842,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Barcelona, Spain: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955842,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Boston, Massachusetts: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955842,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Buenos Aires, Argentina: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955842,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Cape Town, South Africa: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955843,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Copenhagen, Denmark: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955843,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Dubai, United Arab Emirates: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955843,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Hong Kong, China: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955843,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Honolulu, Oahu: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955843,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Lisbon, Portugal: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955843,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #London (Southampton), England: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955843,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Los Angeles, California: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955844,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Miami, Florida: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955844,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #New Orleans, Louisiana: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955844,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #New York, New York: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955844,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Orlando & Beaches (Port Canaveral): (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955844,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Papeete, Tahiti, French Polynesia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955844,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Port Kembla, Australia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955844,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Québec City, Québec: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955844,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Rome (Civitavecchia), Italy: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #San Diego, California: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #San Juan, Puerto Rico: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Santiago (San Antonio), Chile: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Seattle, Washington: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Seward, Alaska: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955846,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Singapore, Singapore: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955846,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Sydney, Australia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955846,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Tampa, Florida: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955846,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Vancouver, British Columbia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955846,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Venice, Italy: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955846,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #signup-fiel-email: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955846,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #your-email-address: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581618955846,
                "type": ""
            }
        ],
        "screenShotFile": "images\\002b0004-0090-00c6-003e-00b600410082.png",
        "timestamp": 1581618923194,
        "duration": 54868
    },
    {
        "description": "I am on Homepage|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "images\\00540009-0085-0086-007b-00ab004a0076.png",
        "timestamp": 1581618980179,
        "duration": 56
    },
    {
        "description": "I navigate to Ports page|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618986874,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618986967,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618987481,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618995052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618996033,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://force.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618997309,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618997309,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618998904,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618998905,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618998905,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618998905,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618998905,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://force.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618998905,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581618998905,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.ncl.com/static/scripts/ncl.bootstrap.scripts.js?v=1581430494068 82:647 Uncaught TypeError: Cannot read property '$on' of undefined",
                "timestamp": 1581618999749,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00690065-0093-0073-00c4-00f700800060.png",
        "timestamp": 1581618982193,
        "duration": 20013
    },
    {
        "description": "When I search for Honolulu Port|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\009f001d-007d-0026-0089-005b000700f1.png",
        "timestamp": 1581619003066,
        "duration": 1544
    },
    {
        "description": "Then Map zoomed to show selected Port|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\00d1002b-006a-00bb-0035-00eb00950043.png",
        "timestamp": 1581619006211,
        "duration": 396
    },
    {
        "description": "Honolulu is in the middle of the map|As a Guest",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id='ports-map']/div/div/div[1]/div[3]/div/div[3]/div[450]/img)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id='ports-map']/div/div/div[1]/div[3]/div/div[3]/div[450]/img)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as getLocation] (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as getLocation] (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\tkucu\\Desktop\\OldProjects\\NCL-master\\Tests\\NCLMain.js:53:24)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Honolulu is in the middle of the map\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\tkucu\\Desktop\\OldProjects\\NCL-master\\Tests\\NCLMain.js:44:5)\n    at addSpecsToSuite (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\tkucu\\Desktop\\OldProjects\\NCL-master\\Tests\\NCLMain.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:956:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:973:10)\n    at Module.load (internal/modules/cjs/loader.js:812:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:724:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "images\\00f30083-0016-00d9-00fd-001e001900d2.png",
        "timestamp": 1581619008487,
        "duration": 80
    },
    {
        "description": "Given Port is displayed as Port of Departure|As a Guest",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id='ports-map']/div/div/div[1]/div[3]/div/div[3]/div[450]/img)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id='ports-map']/div/div/div[1]/div[3]/div/div[3]/div[450]/img)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as getLocation] (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as getLocation] (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at C:\\Users\\tkucu\\Desktop\\OldProjects\\NCL-master\\Tests\\NCLMain.js:85:29\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:804:32\n    at ManagedPromise.invokeCallback_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Given Port is displayed as Port of Departure\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\tkucu\\Desktop\\OldProjects\\NCL-master\\Tests\\NCLMain.js:76:4)\n    at addSpecsToSuite (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\tkucu\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\tkucu\\Desktop\\OldProjects\\NCL-master\\Tests\\NCLMain.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:956:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:973:10)\n    at Module.load (internal/modules/cjs/loader.js:812:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:724:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "images\\0045004c-0049-00d4-0022-00a80098002d.png",
        "timestamp": 1581619009103,
        "duration": 168
    },
    {
        "description": "As a Guest|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619044064,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619044064,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619044065,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619044065,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619044065,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://force.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619044065,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/port-of-call - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619044065,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ 0 The value \"device-320\" for key \"width\" is invalid, and has been ignored.",
                "timestamp": 1581619044112,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #signup-fiel-email: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055113,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #your-email-address: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055113,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Amsterdam, Netherlands: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Athens (Piraeus), Greece: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Auckland, New Zealand: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Barcelona, Spain: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055958,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Boston, Massachusetts: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055959,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Buenos Aires, Argentina: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055959,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Cape Town, South Africa: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055959,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Copenhagen, Denmark: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Dubai, United Arab Emirates: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Hong Kong, China: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Honolulu, Oahu: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Lisbon, Portugal: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #London (Southampton), England: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Los Angeles, California: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Miami, Florida: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055961,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #New Orleans, Louisiana: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055961,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #New York, New York: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055961,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Orlando & Beaches (Port Canaveral): (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055962,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Papeete, Tahiti, French Polynesia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055962,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Port Kembla, Australia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055962,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Québec City, Québec: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055962,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Rome (Civitavecchia), Italy: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055962,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #San Diego, California: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055963,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #San Juan, Puerto Rico: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055963,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Santiago (San Antonio), Chile: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055963,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Seattle, Washington: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Seward, Alaska: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Singapore, Singapore: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Sydney, Australia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Tampa, Florida: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055964,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Vancouver, British Columbia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Venice, Italy: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1581619055965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at https://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619057586,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619057587,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00930056-00cf-00df-00ed-005800bd003e.png",
        "timestamp": 1581619009779,
        "duration": 49563
    },
    {
        "description": "I am on Homepage|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "images\\006e005e-003f-00ec-0096-00de00800031.png",
        "timestamp": 1581619061807,
        "duration": 36
    },
    {
        "description": "I navigate to Shore Excursion page|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619065941,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619065941,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619066353,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619066736,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619066864,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619088680,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619089549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619089549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619089549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619089549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619089549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619089549,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.ncl.com/static/scripts/ncl.shorex.scripts.js?v=1581430494068 41:647 Uncaught TypeError: Cannot read property '$on' of undefined",
                "timestamp": 1581619090261,
                "type": ""
            }
        ],
        "screenShotFile": "images\\001d00c8-004c-0073-001d-006900d10044.png",
        "timestamp": 1581619063761,
        "duration": 27324
    },
    {
        "description": "AND I click Find Excursions|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619095749,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619095755,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619097278,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619098453,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619098453,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619100808,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://force.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619101003,
                "type": ""
            }
        ],
        "screenShotFile": "images\\003b00c0-0073-00d6-00bb-008c00e70023.png",
        "timestamp": 1581619092355,
        "duration": 8444
    },
    {
        "description": "AND Shore Excursions page is present|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "images\\009d00f1-00d3-0073-003f-0014009b00d1.png",
        "timestamp": 1581619102283,
        "duration": 31
    },
    {
        "description": "WHEN Price range is filtered to $0-$30|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+31 - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619116289,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+31 - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619116296,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+31 - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619117758,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+31 - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619117787,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+31 - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619118409,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+31 - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619120047,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+31 - A cookie associated with a cross-site resource at http://force.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1581619120101,
                "type": ""
            }
        ],
        "screenShotFile": "images\\0013003b-00ba-00fd-0001-009d001300d5.png",
        "timestamp": 1581619103226,
        "duration": 16808
    },
    {
        "description": "Given Port is displayed as Port of Departure|As a Guest",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5076,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "images\\00340001-009d-0011-0031-00fc00a8002e.png",
        "timestamp": 1581619123746,
        "duration": 757
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

