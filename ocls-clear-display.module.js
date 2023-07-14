// Display OUR/CLEAR permitted uses directly in Primo
// Requires an URL to the OUR/CLEAR resource inside the services' public note.
// If such an URL is found, use the OUR API to retrieve license information for each service
// and display a summary underneath each service.

import X2JS from 'x2js';
import {oclsClearDisplayConfig} from './ocls-clear-display.config.js';

angular
    .module('oclsClearDisplay', [])
    .factory('oclsClearDisplayConfig', oclsClearDisplayConfig)
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
                        //console.log('OCLS CLEAR display start');
                        
                        var services = vm.parentCtrl.services;
                        var config = oclsClearDisplayConfig;
                        
                        // Go through the list of available services and look for OUR/CLEAR URLs
                        for(let i = 0; i < services.length; i++){
                            
                            if (angular.isDefined(services[i].publicNote)){
                                var clearLinks = services[i].publicNote.match(/(https?:\/\/(clear|ocul)\.scholarsportal\.info\/[^"]+)/g);

                                if (clearLinks){
                                
                                    // Remove public note
                                    services[i].publicNote = '';
                                
                                    clearLinks.forEach(function(foundLink){
                                        //console.log('Found CLEAR link');
                                        let clearLink = foundLink.match(/(https?:\/\/(clear|ocul)\.scholarsportal\.info\/[^"]+\/)(.+)/);
                                        //console.log(clearLink);
                                        let clearBaseUrl = clearLink[1];
                                    
                                        let clearResourceName = clearLink[3];
                                    
                                        oclsClearService.fetchOurData(clearBaseUrl,clearResourceName,i)
                                        .then((data) => {
                                            try{
                                                if (!data)return;
                                                // The data variable contains the license information as a JSON object.
                                                //console.log(data);
                                            
                                                // Build array of usage terms
                                                let usageTerms = [config.title_text];
                                            
                                                let lineCounter = 1;
                                                for(let permissionKey in data.license) {
                                                    
                                                    if ((permissionKey in oclsClearDisplayConfig.terms) && (!oclsClearDisplayConfig.terms[permissionKey].hide)) {
                                                        let permissionLine = '<div class="ocls-clear-display'
                                                            + (config.compact_display ? ' ocls-clear-compact' : '') 
                                                            +'"><div class="ocls-clear-term'
                                                            + (lineCounter % 2 == 0 ? ' ocls-clear-odd' : '')
                                                            + (config.compact_display ? ' ocls-clear-compact' : '') 
                                                            + '"' 
                                                            + ((config.hover_text && config.compact_display) ? ' title="'+ data.license[permissionKey].case + '"' : '')
                                                            + '>'
                                                            + (config.compact_display ? config.terms[permissionKey].short_text : data.license[permissionKey].case) 
                                                            + '</div><div class="ocls-clear-value ocls-clear-' 
                                                            + data.license[permissionKey].usage
                                                            + (config.compact_display ? ' ocls-clear-compact' : '')  
                                                            + '"'
                                                            + (config.hover_text ? ' title="'+ data.license[permissionKey]['definition-short'] + '"' : '')
                                                            + '>' 
                                                            + data.license[permissionKey].usage + '</div></div>';
                                                        usageTerms.push(permissionLine);
                                                        lineCounter++;
                                                    }
                                                }
                                            
                                                if (angular.isDefined(config.footer_text)){
                                                    usageTerms.push('<a href="' + clearBaseUrl + clearResourceName + '" target="_blank">' + config.footer_text + '</a>');
                                                }
                                            
                                            
                                                // If desired by the college, display the license terms inside the public note field
                                                // wrapped in a link to the CLEAR record (to suppress the existing click behaviour)
                                                if (config.display_in_note){
                                                    services[i].publicNote = '<a href="' + clearBaseUrl + clearResourceName + '" target="_blank">' + usageTerms.join('') + '</a>';
                                                
                                                }
                                                else {
                                                    // Otherwise, hijack the built-in license terms display function to add CLEAR terms
                                                    services[i].licenceExist = "true";
                                                    services[i].licence = usageTerms;  
                                                }                                 
                                        
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
                }
            );
        }
    }])

    .component('prmAlmaViewitItemsAfter', {
        bindings: { parentCtrl: '<' },
        controller: 'oclsClearDisplayController'
    });