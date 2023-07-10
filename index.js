// Display OUR/CLEAR permitted uses directly in Primo
// Requires an URL to the OUR/CLEAR resource inside the services' public note.
// If such an URL is found, use the OUR API to retrieve license information for each service
// and display a summary underneath each service.

import X2JS from 'x2js';

angular
    .module('oclsClearDisplay', [])
    .factory('oclsClearService', ['$http', '$sce',function($http, $sce){
        function fetchOurData(baseUrl,resourceName,locationIndex){
            let url = baseUrl + 'api/?tag=' + resourceName;
            
            var x2js = new X2JS();
            
            $sce.trustAsResourceUrl(url);

            return $http.get(url)
                .then(
                    function(response){
                        return x2js.xml2js(response.data);
                    },
                    function(httpError){
                        if (httpError.status === 404)return null;
                        let error = "an error occured: oclsClearService callback: " + httpError.status;
                        if (httpError.data && httpError.data.errorMessage) {
                            error += ' - ' + httpError.data.errorMessage;
                        }
                        console.error(error);
                        return null;
                    }
                );
            }
            return {
                fetchOurData : fetchOurData
            };
        }])
    .controller('oclsClearDisplayController', ['$scope', 'oclsClearService', function ($scope, oclsClearService) {
        
        function addPermissionsObject(term,value,termText,valueText){
            return '<dt title="' + termText + '">' + term + '</dt><dd class="ocls-clear-term-' + value + '" title="' + valueText + '">' + value + '</dd>';
        };
        
        var vm = this;
        this.$onInit = function() {
            $scope.$watch(
                function () {
                    if (angular.isDefined(vm.parentCtrl.services)) {
                        // As soon as there are location details, watch for changes in the list of location items
                        return vm.parentCtrl.services;
                    }
                    return 0;
                },
                function () {
                    // This listener function is called both during initial run and whenever the watched variable changes.
                    if (angular.isDefined(vm.parentCtrl.services)){
                        console.log('OCLS CLEAR display start');
                        
                        var services = vm.parentCtrl.services;
                        
                        // Go through the list of available services and look for OUR/CLEAR URLs
                        for(let i = 0; i < services.length; i++){
                            console.log(i);
                            console.log(services[i]);
                            var clearLinks = services[i].publicNote.match(/([^"]+\.scholarsportal\.info\/[^"]+)/g);
                            console.log(clearLinks);

                            if (clearLinks){
                                
                                services[i].publicNote = '';
                                
                                clearLinks.forEach(function(foundLink){
                                    console.log('Found CLEAR link');
                                    let clearLink = foundLink.match(/(.+\.scholarsportal\.info\/[^"]+\/)(.+)/);
                                    let clearBaseUrl = clearLink[1];
                                    console.log(clearBaseUrl);
                                    let clearResourceName = clearLink[2];
                                    console.log(clearResourceName);
                                    oclsClearService.fetchOurData(clearBaseUrl,clearResourceName,i)
                                    .then((data) => {
                                        try{
                                            if (!data)return;
                                            // The data variable contains the license information as a JSON object.
                                            console.log(data);
                                            // Replace the public note content with a summary display of this information
                                            let permissionsOutput = '<div class="ocls-clear-display"><a href="' + clearBaseUrl + clearResourceName + '" target="_blank">Permitted uses (hover for details or click for more info):<dl>';
                                            if (data.license.e_reserves){
                                                permissionsOutput += addPermissionsObject('E-Reserve?',data.license.e_reserves.usage, data.license.e_reserves.case, data.license.e_reserves['definition-short']);
                                            }
                                            if (data.license.cms){
                                               permissionsOutput = permissionsOutput +
                                                addPermissionsObject('Blackboard?',data.license.cms.usage,data.license.cms.case,data.license.cms['definition-short']);
                                            }
                                            if (data.license.course_pack){
                                               permissionsOutput = permissionsOutput +
                                                addPermissionsObject('Course packs?',data.license.course_pack.usage,data.license.course_pack.case,data.license.course_pack['definition-short']);
                                            }
                                            if (data.license.durable_url){
                                               permissionsOutput = permissionsOutput +
                                                addPermissionsObject('Link?',data.license.durable_url.usage,data.license.durable_url.case,data.license.durable_url['definition-short']);
                                            }
                                            /*if (data.license.ill_print){
                                               permissionsOutput = permissionsOutput +
                                                addPermissionsObject('ILL?',data.license.ill_print.usage,data.license.ill_print.case,data.license.ill_print['definition-short']);
                                            }*/
                                            permissionsOutput = permissionsOutput + '</dl></a></div>';
                                            services[i].publicNote = services[i].publicNote + permissionsOutput;
                                        
                                        
                                        }
                                        catch(e){
                                            console.error("an error occured: oclsClearDisplayController:\n\n");
                                            console.error(e.message);
                                        }
                                    })
                                    }
                                    
                                )
                                
                            }
                            
                            
                        }
                         
                    }
                }
            );
        }
    }])

    .component('prmAlmaViewitItemsAfter', {
        bindings: { parentCtrl: '<' },
        controller: 'oclsClearDisplayController'
    });