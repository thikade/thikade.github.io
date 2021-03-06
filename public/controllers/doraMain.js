﻿/// <reference path="../angular.js" />


// angular.module("dora", [ "customFilters", "ui.bootstrap", "ngRoute", 'angular-loading-bar', 'ngAnimate', 'customServices'])
angular.module("dora", [ "customFilters", "ui.bootstrap", "ngRoute", 'angular-loading-bar', 'ngAnimate'])

    .config(function ($routeProvider) {

        // $routeProvider.when("/other", {
        //     templateUrl: "/views/doraPlaceholder.html"
        // });

        $routeProvider.when("/setup", {
            templateUrl: "views/doraSetupView.html"
        });

        $routeProvider.when("/create/droplet", {
            templateUrl: "views/doraCreateDropletView.html"
        });

        $routeProvider.otherwise({
            templateUrl: "views/doraCreateDropletView.html"
        });

    });


//configure module
angular.module("dora")

.constant("CONSTANTS",
    {
        "DROPLET_ACTION_REBOOT": 0,
        "DROPLET_ACTION_SHUTDOWN": 1,
        "DROPLET_ACTION_POWERON": 2,
        "DROPLET_ACTION_POWEROFF": 3,
        "DROPLET_ACTION_DESTROY": 4,
        "DROPLET_ACTION_SNAPSHOT": 5,
        "DROPLET_ACTION_SNAPANDDESTROY": 6,
        "SNAPSHOT_ACTION_DESTROY": 7
    })


.constant("doApiCfg",
    {
        "doApiBaseUrl"     : "https://api.digitalocean.com",
        "doApiCmdImages"   : "v2/images",
        "doApiCmdDroplets" : "v2/droplets",
        "doApiCmdActions"  : "v2/actions",
        "doApiCmdRegions"  : "v2/regions",
        "doApiCmdSizes"    : "v2/sizes",
        "doApiCmdSSHKeys"  : "v2/account/keys",
        "doApiParamListSnapshots" : "type=snapshot&private=true",
        "doApiParamListPubImages" : "type=snapshot&private=false",
        "doApiParamListAppImages" : "type=application",
        "doApiParamPowerOn"   : "type=power_on",
        "doApiParamPowerOff"  : "type=power_off",
        "doApiParamShutdown"  : "type=shutdown",
        "doApiParamReboot"    : "type=reboot",
        "doApiParamSnapshot"  : "type=snapshot"
    })

.controller("DoraMainController", function ($scope, $http, $location, $timeout, doApiCfg, CONSTANTS, modalDialogService) {

// store token in localstorage: http://html5doctor.com/storing-data-the-simple-html5-way-and-a-few-tricks-you-might-not-have-known/

    $scope.consoleLog = function (msg) {
        console.log(msg);
    };

    $scope.consoleLog("doApiBaseUrl: "+ doApiCfg.doApiBaseUrl);
    
    var httpConfig = {
            headers:  {
                // needs to be set by calling "updateHTTPConfigAuthorization"
                //'Authorization': 'Bearer ' + "xxxx",
                'Accept': 'application/json',
            }
    };

    // mousetrap shortcuts
    Mousetrap.bind("?", function() { console.log('show shortcuts! (not implemented yet)'); });
    Mousetrap.bind("shift+r", function() { console.log('refresh!'); $scope.refreshAllDOInfos(); });

    $scope.CONSTANTS = CONSTANTS;
    $scope.data = {};
    $scope.data.settings = { showConsole: true };
    $scope.data.consoleText = "";
    //$scope.data.droplets = [];
    $scope.data.bearerToken = undefined;
    $scope.data.apiResponse = {};
    $scope.data.newDroplet  = { keys: {}, keyNames: [] };
    
    // container for existing droplets
    // $scope.data.droplets = [];

    $scope.data.error = null;

    $scope.data.validation = { result : null };

    $scope.navigation = { selectedMenuButton: "" };


    $scope.updateHTTPConfigAuthorization = function (token) {
        httpConfig.headers.Authorization = 'Bearer ' +  token;
        $scope.consoleLog(angular.toJson(httpConfig.headers,true));

    };

    $scope.storeToken = function () {
        localStorage.setItem("DOToken", $scope.data.bearerToken);
        $scope.consoleLog("token saved to localStorage");
    };

    // get token from locastorage and store as bearer token &  update httpConfig
    $scope.retrieveToken = function () {
        var tmpToken = localStorage.getItem("DOToken");
        $scope.consoleLog("retrieving Token");
        if (tmpToken) {
            $scope.consoleLog("token found in localStorage: " + tmpToken);
            $scope.data.bearerToken = tmpToken;
            $scope.updateHTTPConfigAuthorization(tmpToken);
        }
        else {
            $scope.consoleLog("token not found!");
            tmpToken = null;
        }
        return tmpToken;
    };

    $scope.deleteToken = function () {
        var tmpToken = $scope.retrieveToken();
        if (tmpToken) {
            localStorage.removeItem("DOToken");
            $scope.consoleLog("token deleted from localStorage");
            $scope.data.validation.result = "Token deleted from local storage.";
        }
        else {
            $scope.consoleLog("token not found in localStorage");
            $scope.data.validation.result = "Error deleting token from local storage.";
        }
            
    };

    $scope.dropletsExist = function() {
        var d = $scope.data.apiResponse.droplets;
        if (d && d.droplets.length > 0) {
            return true;
        }
        return false;
    };

    // validate and store token in localstorage
    $scope.tokenValidation = function () {
        $scope.updateHTTPConfigAuthorization($scope.data.bearerToken);
        var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdRegions;
        $http.get(url, httpConfig)
            .success(function (data) {
                $scope.consoleLog("token validation ok");
                $scope.storeToken($scope.data.bearerToken);
                $scope.data.validation.result = "Token verified and stored locally.";
                $scope.consoleLog("token stored locally");
                // refresh after delay 
                $timeout(
                    function(){
                        $scope.consoleLog("timeout fired!");
                        $scope.refreshAllDOInfos();
                        $scope.navigation.selectedMenuButton = "create";
                        $location.path("/create/droplet");
                    }, 1500);


            })
            .error(function (error) {
                $scope.data.apiError = error;
                $scope.data.validation.result = "Error during token verification!";
                $scope.consoleLog("token verification error,  returned: " + error);
                $scope.consoleLog("token NOT stored!");
            })
            .finally(function () {
                //$location.path("/complete");
            });
    };

    $scope.getDOPrivateSnapshots = function() {
       var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdImages + "?" + doApiCfg.doApiParamListSnapshots ;
        $http.get(url, httpConfig)
            .success(function (data) {
                $scope.consoleLog("getDOPrivateSnapshots ok");
                $scope.data.apiResponse.privateSnapshots = data;
            })
            .error(function (error) {
                $scope.data.apiError = error;
                $scope.consoleLog("getDOPrivateSnapshots error returned: " + error);
            })
            .finally(function () {
            });
    };

    $scope.getDOPublicImages = function() {
       var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdImages + "?" + doApiCfg.doApiParamListPubImages ;
        $http.get(url, httpConfig)
            .success(function (data) {
                $scope.consoleLog("getDOPublicImages ok");
                $scope.data.apiResponse.publicImages = data;
            })
            .error(function (error) {
                $scope.data.apiError = error;
                $scope.consoleLog("getDOPublicImages error returned: " + error);
            })
            .finally(function () {
            });
    };

    $scope.getDOPublicApplications = function() {
       var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdImages + "?" + doApiCfg.doApiParamListAppImages ;
        $http.get(url, httpConfig)
            .success(function (data) {
                $scope.consoleLog("getDOPublicApplicatons ok");
                $scope.data.apiResponse.publicApplications = data;
            })
            .error(function (error) {
                $scope.data.apiError = error;
                $scope.consoleLog("getDOPublicApplicatons error returned: " + error);
            })
            .finally(function () {
            });
    };

    $scope.getDODroplets = function() {
       var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdDroplets;
        $http.get(url, httpConfig)
            .success(function (data) {
                $scope.consoleLog("getDODroplets ok");
                $scope.data.apiResponse.droplets = data;
            })
            .error(function (error) {
                $scope.data.apiError = error;
                $scope.consoleLog("getDODroplets error returned: " + error);
            })
            .finally(function () {
                //$location.path("/complete");
            });
    };
    $scope.getDOSizes = function() {
       var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdSizes;
        $http.get(url, httpConfig)
            .success(function (data) {
                $scope.consoleLog("getDOSizes ok");
                $scope.data.apiResponse.sizes = data;
                // for (var i=0; i < data.sizes.length; i++ ) {
                //     $scope.consoleLog("ss: " + data.sizes[i].slug);
                //}
            })
            .error(function (error) {
                $scope.data.apiError = error;
                $scope.consoleLog("getDOSizes error returned: " + error);
            })
            .finally(function () {
                //$location.path("/complete");
            });
    };

   $scope.getDORegions = function() {
       var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdRegions;
       $scope.consoleLog("getDORegions: httpconfig: " + angular.toJson(httpConfig, true));
        $http.get(url, httpConfig)
            .success(function (data) {
                $scope.consoleLog("getDORegions ok"); //+angular.toJson(data,true));
                $scope.data.apiResponse.regions = data;
            })
            .error(function (error) {
                $scope.data.apiError = error;
                $scope.consoleLog("getDORegions error returned: " + error);
            })
            .finally(function () {
                //$location.path("/complete");
            });
    };

   $scope.getDOKeys = function() {
       var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdSSHKeys;
        $http.get(url, httpConfig)
            .success(function (data) {
                $scope.consoleLog("getDOKeys ok"); //+angular.toJson(data,true));
                $scope.data.apiResponse.sshkeys = data;
            })
            .error(function (error) {
                $scope.data.apiError = error;
                $scope.consoleLog("getDOKeys error returned: " + error);
            })
            .finally(function () {
                //$location.path("/complete");
            });
    };


    $scope.dropletNameFromSnapshotName = function(name) {
        var pos = name.indexOf("_");
        if (pos < 0) {
            pos = name.indexOf("-");
        }
        if (pos < 0) {
            pos = name.indexOf(".");
        }
        if (pos < 0) {
            pos = name.indexOf(" ");
        }
        if (pos < 0) {
            return name;
        }
        return name.slice(0,pos);
    };

    $scope.setSnapshotForNewDroplet = function(o) {
        $scope.consoleLog("new droplet: snapshot is: " + o.name + "  ( " + o.id + " ) available in regions: " + o.regions);
        $scope.consoleLog("old snapshot object: " + angular.toJson($scope.data.newDroplet.snapshot));
        // toggle snapshot data if it was selected previously!
        if ($scope.data.newDroplet.snapshot) {
            // this clears selection
            $scope.data.newDroplet.snapshot = undefined;

        } else {
            $scope.data.newDroplet.snapshot = { name: o.name, id: o.id , distribution: o.distribution, regionID: undefined };
            if (o.private) {
                $scope.data.newDroplet.dropletName = $scope.dropletNameFromSnapshotName(o.name);
                $scope.data.newDroplet.snapshot.regionID = o.regions[0];
            }
            else {
                $scope.data.newDroplet.dropletName = o.distribution + "-" + $scope.dropletNameFromSnapshotName(o.name);
            }
        }
    };

   $scope.setRegionForNewDroplet = function(o) {
        $scope.consoleLog("new droplet: region is: " + o.name + " ( " + o.slug + " )");
        $scope.data.newDroplet.region = { name: o.name, id: o.slug};
    };

   $scope.setSizeForNewDroplet = function(name) {
        $scope.consoleLog("new droplet: size is: " + name);
        $scope.data.newDroplet.size = name;
    };

   $scope.newDropletKeyIsSelected = function(keyName) {
        var keyIDs = Object.keys($scope.data.newDroplet.keys);
        for (var i=0; i < keyIDs.length; i++) {
            var k = keyIDs[i];
            var v = $scope.data.newDroplet.keys[k];
            if (v === keyName ) {
                return true;
            }
        }
        return false;
    };

    $scope.setKeysForNewDroplet = function(o) {
        //console.log("setKeysForNewDroplet");
        $scope.consoleLog("new droplet: toggling key : " + o.id + "( " + o.name + " )");
        //toggle key, if already there, delete key
        if ($scope.data.newDroplet.keys[o.id]) {
            delete $scope.data.newDroplet.keys[o.id];
        }
        else {
            $scope.data.newDroplet.keys[o.id] = o.name;
        }
        // now compute the key Name string for display
        var keyIDs = Object.keys($scope.data.newDroplet.keys);
        //console.log("keyIDs Json: " + angular.toJson(keyIDs));
        
        $scope.data.newDroplet.keyNameString = "";
        for (var i=0; i < keyIDs.length; i++) {
            var k = keyIDs[i];
            var v = $scope.data.newDroplet.keys[k];
            //console.log("adding key:" + k + " / " + v);
            $scope.data.newDroplet.keyNameString =
                $scope.data.newDroplet.keyNameString + " " + v;
        }
        //console.log("final keystring:" + $scope.data.newDroplet.keyNameString);
    };

    $scope.newDropletDefinitionComplete = function() {
        var d = $scope.data.newDroplet;
        var keysDefined = false;
        var sizeDefined = false;
        var regionDefined = false;
        var snapshotDefined = false;

        if ( angular.isDefined(d.keys) && Object.keys(d.keys).length > 0 ) { keysDefined = true;}
        if ( angular.isDefined(d.size) ) { sizeDefined = true;}
        if ( angular.isDefined(d.snapshot) ) { snapshotDefined = true;}
        if ( angular.isDefined(d.region) ) { regionDefined = true;}

        // $scope.consoleLog("----------------");
        // $scope.consoleLog("keysDefined    : "+ keysDefined);
        // $scope.consoleLog("sizeDefined    : "+ sizeDefined);
        // $scope.consoleLog("regionDefined  : "+ regionDefined);
        // $scope.consoleLog("snapshotDefined: "+ snapshotDefined);
        // $scope.consoleLog("----------------");
        if ( keysDefined && sizeDefined && regionDefined && snapshotDefined) {
            return true;
        } else {
            return false;
        }

    };

    $scope.createNewDroplet = function() {
        $scope.data.newDroplet.id = undefined;

        $scope.consoleLog(" ---- creating new droplet ----");
        $scope.consoleLog("     " + "name:      " + $scope.data.newDroplet.dropletName);
        $scope.consoleLog("     " + "snapshot:  " + angular.toJson($scope.data.newDroplet.snapshot));
        $scope.consoleLog("     " + "region:    " + angular.toJson($scope.data.newDroplet.region));
        $scope.consoleLog("     " + "size:      " + $scope.data.newDroplet.size);
        $scope.consoleLog("     " + "keys:      " + angular.toJson($scope.data.newDroplet.keys));
        $scope.consoleLog(" ---- creating new droplet ----");
        // create Object for POST request 
        // { "name": "dockerer2", "region": "fra1", "size": "1gb", "image": 13931724, "ssh_keys": [ 998948, 998949 ], "backups": "false" }

        var newDroplet = {
            "name"    : $scope.data.newDroplet.dropletName,
            "image"   : $scope.data.newDroplet.snapshot.id,
            "region"  : $scope.data.newDroplet.region.id,

            "size"    : $scope.data.newDroplet.size,
            "ssh_keys": Object.keys( $scope.data.newDroplet.keys ),
            "backup"  : false
        };
        $scope.consoleLog("POST body START -------");
        $scope.consoleLog(angular.toJson(newDroplet,true) );
        $scope.consoleLog("POST body END   -------");
        
        $scope.consoleLog("");

        var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdDroplets;
        $http.post(url, newDroplet, httpConfig)
            .success(function (response) {
                $scope.consoleLog("createDroplet success!");
                $scope.consoleLog("response : "  + angular.toJson(response, true));
                $scope.data.newDroplet.id = response.droplet.id;
                $scope.data.consoleText = "New droplet creation started: " + newDroplet.name + " = " + response.droplet.id + "\n"+ $scope.data.consoleText;
            })
            .error(function (errResponse) {
                $scope.data.apiError = errResponse;
                $scope.consoleLog("createDroplet error : " + angular.toJson(errResponse, true));
                $scope.data.consoleText = "new droplet creation error!";
            })
            .finally(function () {
                //$location.path("/complete");
            });

        $scope.consoleLog("");
    };


    $scope.oSort = function (o, sortkey) {
        var idxArray = o.sort( function(x, y) {
            console.log("x: " + x + " / y: " +y);
            console.log("a(x): " + a[x].name + "  / " + "a(y): " + a[y].name);
            return ((a[x].name) > (a[y].name));
        });
        var newArray = [];
        for (var i=0; i <  idxArray.length; i++) {
            var idx = idxArray[i];
            newArray.push( o[idx] );
        }
    return newArray;
    };


    $scope.dropletAction = function(droplet, mode) {
        var url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdDroplets + "/" + droplet.id +  "/actions";
        var postParams;
        if (!mode) {
            $scope.consoleLog("dropletaction: mode undefined!");
            return;
        }
        switch (mode) {
            case CONSTANTS.DROPLET_ACTION_POWEROFF:
                postParams = doApiCfg.doApiParamPowerOff;
                $scope.data.consoleText = droplet.name + " - PowerOff\n" + $scope.data.consoleText;
                break;
            
            case CONSTANTS.DROPLET_ACTION_POWERON:
                postParams = doApiCfg.doApiParamPowerOn;
                $scope.data.consoleText = droplet.name + " - PowerOn\n" + $scope.data.consoleText;
                break;
            
            case CONSTANTS.DROPLET_ACTION_SHUTDOWN:
                postParams = doApiCfg.doApiParamShutdown;
                $scope.data.consoleText = droplet.name + " - Shutdown\n" + $scope.data.consoleText;
                break;

            case CONSTANTS.DROPLET_ACTION_REBOOT:
                postParams = doApiCfg.doApiParamReboot;
                $scope.data.consoleText = droplet.name + " - Reboot\n" + $scope.data.consoleText;
                break;

            case CONSTANTS.DROPLET_ACTION_SNAPSHOT:
                var now = new Date();
                var dateString = now.toISOString().slice(0, 19);
                var snapName = droplet.name + "_"  + dateString;
                postParams = doApiCfg.doApiParamSnapshot + "&name=" + snapName;
                $scope.data.consoleText = droplet.name + " - new snapshot: " + snapName + "\n" + $scope.data.consoleText;
                $scope.consoleLog("dropletAction: droplet id: " + droplet.id);
                break;

            case CONSTANTS.DROPLET_ACTION_DESTROY:
                url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdDroplets + "/" + droplet.id;
                $scope.data.consoleText = droplet.name + " - Destroy\n" + $scope.data.consoleText;
                postParams = null;
                break;

            case CONSTANTS.DROPLET_ACTION_SNAPANDDESTROY:
                url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdDroplets + "/" + droplet.id;
                postParams = null;
                $scope.consoleLog("dropletAction: snapshot and destroy: not implemented yet!");
                $scope.data.consoleText = droplet.name + " - Snapshot & Destroy\n" + $scope.data.consoleText;
                return;

            case CONSTANTS.SNAPSHOT_ACTION_DESTROY:
                url = doApiCfg.doApiBaseUrl + "/" + doApiCfg.doApiCmdImages + "/" + droplet.id;
                postParams = null;
                $scope.consoleLog("dropletAction: delete snapshot: " + droplet.id + " (" + droplet.name + ")");
                $scope.data.consoleText = "Deleting Snapshot: " + droplet.name + " (" + droplet.id + ")\n" + $scope.data.consoleText;
                break;

            default:
                postParams = "unknown_action_" + mode;
        }

        if (postParams) {
            url += "?" + postParams;
        }
        $scope.consoleLog("dropletAction: droplet id: " + droplet.id);
        $scope.consoleLog("dropletAction: droplet name: " + droplet.name);
        $scope.consoleLog("dropletAction: url: " + url);

        if (mode === CONSTANTS.DROPLET_ACTION_DESTROY || mode === CONSTANTS.SNAPSHOT_ACTION_DESTROY) {
            //modalDialogService
            var modalOptions = {
                closeButtonText: 'Cancel',
                actionButtonText: 'Yes!',
                headerText: 'Confirm Delete',
                bodyText: 'Are you sure?'
            };

            modalDialogService.showModal({}, modalOptions).then(function (result) {

                //console.log("DELETE ACTION CALLED");

                $http.delete(url, httpConfig)
                    .success(function (data) {
                        $scope.consoleLog("dropletAction: destroy cmd issued. check back later for status updates.");
                        $scope.data.consoleText = "destroy initiated successfully!\n" + $scope.data.consoleText;
                    })
                    .error(function (error) {
                        $scope.consoleLog("ERROR: dropletAction: cmd issued, but error returned.");
                        $scope.consoleLog("ERROR: cmd was: DELETE " + url);
                        $scope.consoleLog("ERROR: id: " + error.id + "  : '" + error.message + "'");
                        $scope.data.consoleText = "destroy cmd error.\n" + $scope.data.consoleText;
                        $scope.data.consoleText = "cmd was: DELETE " + url + "\n" + $scope.data.consoleText;
                    })
                    .finally(function () {
                        //$location.path("/complete");
                    });
            });
        }
        else {
            $http.post(url, null, httpConfig)
                .success(function (data) {
                    $scope.consoleLog("dropletAction: cmd issued. check back later for status updates.");
                    $scope.data.consoleText = "action initiated successfully!\n" + $scope.data.consoleText;
                })
                .error(function (error) {
                    $scope.consoleLog("ERROR: dropletAction: cmd issued, but error returned.");
                    $scope.consoleLog("ERROR: id: " + error.id + "  : '" + error.message + "'");
                    $scope.data.consoleText = "action cmd error\n" + $scope.data.consoleText;
                })
                .finally(function () {
                    //$location.path("/complete");
                });
        }


    };

    $scope.copyToClipBoard = function(text) {
        if (text) {
            window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
        }
    };

    $scope.refreshAllDOInfos = function() {
        $scope.getDODroplets();
        $scope.getDOPrivateSnapshots();
        // $scope.getDOPublicImages();
        // $scope.getDOPublicApplications();
        $scope.getDOSizes();
        $scope.getDORegions();
        $scope.getDOKeys();
    };

    // ===========================
    // main init
    // ===========================

    $scope.retrieveToken();

    if ($scope.data.bearerToken) {
        $scope.navigation.selectedMenuButton = "create";
        $location.path("/create/droplet");
        $scope.refreshAllDOInfos();
    }
    else {
        // no token stored -> got to setup
        $scope.navigation.selectedMenuButton = "setup";
        $location.path("/setup");
    }
});
