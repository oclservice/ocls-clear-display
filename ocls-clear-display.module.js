// Display OUR/CLEAR permitted uses directly in Primo
// Requires an URL to the OUR/CLEAR resource inside the services' public note.
// If such an URL is found, use the OUR API to retrieve license information for each service
// and display a summary underneath each service.

// CLEAR display configuration
// Edit the following to customize how permitted uses should display
// Refer to https://github.com/oclservice/ocls-clear-display for details

const oclsClearDisplayConfig = {
        compact_display : false,
        hover_text : true,
        display_in_note : false,
        title_text: '<b>Usage rights (hover on answer for details):</b>',
        local_instance: '',
        footer_text: 'More information',
        terms: {
            cms: {
                short_text: 'CMS?'
            },
            course_pack: {
                short_text: 'Course Packs?'
            },
            distribute: {
                hide: true
            },
            durable_url: {
                short_text: 'Link?'
            },
            e_reserves: {
                short_text: 'E-Reserve?'
            },
            ill_print: {
                short_text: 'ILL?'
            },
            local_loading: {
                hide: true
            },
            print: {
                short_text: 'Print?'
            },
            research: {
                hide: true
            },
            text_mining: {
                hide: true
            }
        }
}

/* Helper functions for XML to JSON conversion
   Inspired from https://observablehq.com/@visnup/xml-to-json

Copyright 2020 Visnu Pitiyanuvath
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

*/

function childCounts(node){
  const counts = {};
  for (const {localName} of node.children)
    counts[localName] = (counts[localName] || 0) + 1;
  return counts;
}

function domToJSON(node) {
  let obj = Object.create(null);
  if (node.children.length === 0 && node.innerHTML) {
    obj = node.innerHTML;
  }

  const counts = childCounts(node);

  for (const child of node.children) {
    const { localName } = child;
    if (counts[localName] > 1) {
      (obj[localName] = obj[localName] || []).push(domToJSON(child));
    } else {
      obj[localName] = domToJSON(child);
    }
  }

  let attrs = node.attributes;
  if (attrs) {
    for (let i = attrs.length - 1; i >= 0; i--) {
      obj[attrs[i].name] = attrs[i].value;
    }
  }

  return obj;
}

function xml2json(xml) {
    const parser = new DOMParser();
    xml = parser.parseFromString(xml, "application/xml");
    const errorNode = xml.querySelector('parsererror');
    if (errorNode) {
        // parsing failed
        return null;
    } else {
        // parsing succeeded
        return domToJSON(xml);
    }
}

// Main CLEAR display module

angular
    .module('oclsClearDisplay', [])
    .factory('oclsClearDisplayConfig', oclsClearDisplayConfig)
    .factory('oclsClearService', ['$http', '$sce',function($http, $sce){
        function fetchOurData(baseUrl,resourceName,locationIndex){
            let url = baseUrl + 'api/?tag=' + resourceName;
            
            $sce.trustAsResourceUrl(url);

            return $http.get(url)
                .then(
                    function(response){
                        return xml2json(response.data);
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
                                var clearLinks = [...services[i].publicNote.matchAll(/<a +href="(https?:\/\/(clear|ocul)\.scholarsportal\.info)\/([^"]+)\/(.+?)".*?<\/a>/g)];
                                
                                if (clearLinks){
                                    
                                    let originalNote = services[i].publicNote;

                                    clearLinks.forEach(function(foundLink){
                                        
                                        // Remove the found link from the note
                                        originalNote = originalNote.replace(foundLink[0],'');
                                        
                                        let clearBaseUrl = foundLink[1];
                                        let clearInstanceName = foundLink[3];
                                        let clearResourceName = foundLink[4];
                                        
                                        if (config.local_instance){
                                            clearInstanceName = config.local_instance;
                                        }
                                
                                        oclsClearService.fetchOurData(clearBaseUrl+'/'+clearInstanceName+'/',clearResourceName,i)
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
                                                    usageTerms.push('<a href="' + clearBaseUrl +'/'+clearInstanceName+'/'+ clearResourceName + '" target="_blank">' + config.footer_text + '</a>');
                                                }
                                                
                                                // If desired by the college, display the license terms inside the public note field
                                                // wrapped in a link to the CLEAR record (to suppress the existing click behaviour)
                                                if (config.display_in_note){
                                                    services[i].publicNote = '<a href="' + clearBaseUrl +'/'+clearInstanceName+'/'+ clearResourceName + '" target="_blank">' + usageTerms.join('') + '</a>';

                                                    // Append what remains of the original note to the end, unless it's only empty HTML tags
                                                    if (originalNote.match(/(?<=>)[\w\s]+(?=<)/)) {
                                                        services[i].publicNote = services[i].publicNote + originalNote;
                                                    }
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