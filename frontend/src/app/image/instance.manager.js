/**
 * @ngdoc service
 *
 * @name webviewer.service:wvInstanceManager
 *
 * @description
 * The `wvInstanceManager` provide information relative to image at the
 * instance level. These are mainly the DICOM tags. It is used by the image 
 * model, to retrieve tags. Most of the time, an image == a DICOM instance, but 
 * in case of multiframe instance, one image == one DICOM frame. Therefore,
 * `wvInstanceManager` is useful to cache things at the instance level.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .factory('wvInstanceManager', wvInstanceManager);

    /* @ngInject */
    function wvInstanceManager($q, wvConfig) {
        var service = {
        	/**
             * @ngdoc method
             * @methodOf webviewer.service:wvInstanceManager
             *
             * @name osimis.InstanceManager#getInfos
             * @param {string} id Id of the instance (orthanc format)
             * @return {promise<object>} A hash of the tags (wrapped in promise)
             * 
             * @description
        	 * Retrieve a hash of tags for a specified instance.
        	 */
            getInfos: getInfos,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvInstanceManager
             *
             * @name osimis.InstanceManager#setInfos
             * 
             * @param {string} id 
             * The id of the instance (orthanc format).
             *
             * @param {object} tags
             * Object containing tags on format {tag1: content1, ...}
             *
             * @description
             * Set the tags of an instance.
             * 
             * Used mainly for optimization: retrieving all simplified tags at one single request within the wvSeriesManager
             * instead of many requests for each instances.
             */
            setInfos: setInfos,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvInstanceManager
             *
             * @name osimis.InstanceManager#onTagsSet
             * 
             * @param {function} callback
             * A callback function triggered each time a tag as been defined.
             * 
             * - @param {string} id
             * The id of the instance (orthanc format).
             *
             * - @param {object} tags
             * Object containing tags on format {tag1: content1, ...}
             * 
             * - @param {object} seriesId
             * 
             * @description
             * A callback function triggered each time a tag as been defined.
             * 
             * Required as some part of the cornerstone API doesn't fit well
             * with the getter/setter we use (because they use promises).
             */
            onTagsSet: new osimis.Listener(),
            
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvInstanceManager
             * 
             * @name osimis.InstanceManager#getParentStudyId
             * 
             * @param {string} id
             * The id of the instance (orthanc format)
             * 
             * @description
             * get the study id of the instanceId. Similar to StudyManager.getFromInstanceId but reversed to retrieve the study id.
             * Written to avoid circular dependency of wvStudyManager.
             */
            getParentStudyId: getParentStudyId
        };

        /**
         * Cache tags by instanceId when a series is loaded,
         * because all images' tags are only retrieved in one single series http request
         * to avoid unnecessary http requests.
         * 
         * @type {object}
         *    * keys: instance ids
         *    * values: tags request promises
         *    * format: {<orthancInstanceId>: <promiseOfTagsHash>, ...}
         *
         * @todo Flush the content
         */
        var _infosByInstances = {};

        return service;

        ////////////////

        function getParentStudyId(id){
            var request = new osimis.HttpRequest();
            request.setHeaders(wvConfig.httpRequestHeaders);
            return request
                .get(wvConfig.orthancApiURL + '/instances/' + id + '/study')
                .then(function(response) {
                    var studyId = response.data.ID;
                    return studyId
                }, function(err) {
                    // @todo uncache & do something with the error.
                    
                    return $q.reject(err);
                });
        }

        function getInfos(id) {
            // Load image tags if not already in loading.
            if (!_infosByInstances.hasOwnProperty(id)) {
                // rebuild the info as done in backend
                console.log("I thought this was not used anymore -> we need to get 'SeriesOrthancId'");
                return "error";
                // var request = new osimis.HttpRequest();
                // request.setHeaders(wvConfig.httpRequestHeaders);
                // _infosByInstances[id] = request
                //     .get(wvConfig.orthancApiURL + '/instances/'+id+'/simplified-tags')
                //     .then(function(response) {
                //         var tags = response.data;

                //         return { "TagsSubset" : tags,
                //         "SeriesOrthancId": TODO !!!
                //       };
                //     }, function(err) {
                //     	// @todo uncache & do something with the error.
                    	
                //     	return $q.reject(err);
                //     });
            }

            // Return the tags promise.
            return _infosByInstances[id];
        }

        function setInfos(id, instanceInfos, seriesId) {
            instanceInfos["SeriesOrthancId"] = seriesId;
          // Always wrap tags in a promise to stay consistant with the API.
            var infosPromise = $q.when(instanceInfos);
        	
        	// Store the tags.
            _infosByInstances[id] = infosPromise;

            // Trigger event.
            service.onTagsSet.trigger(id, instanceInfos.TagsSubset);
        }
    }
})();