/**
 * @ngdoc service
 *
 * @name webviewer.service:wvStudyManager
 *
 * @description
 * Manage study preloading.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .factory('wvStudyManager', wvStudyManager);

    /* @ngInject */
    function wvStudyManager($q, $rootScope, wvConfig, wvSeriesManager, wvVideoManager, wvPdfInstanceManager) {
        var service = {
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvStudyManager
             * 
             * @name osimis.StudyManager#get
             *
             * @param {string} id
             * The Orthanc study id.
             * 
             * @return {Promise<osimis.Study>}
             * The Osimis Study Model.
             * 
             * @description
             * Retrieve a study model from an orthanc study id.
             */
            get: get,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvStudyManager
             * 
             * @name osimis.StudyManager#getByInstanceId
             *
             * @param {string} id
             * The Orthanc instance id.
             * 
             * @return {Promise<osimis.Study>}
             * The Osimis Study Model.
             * 
             * @description
             * Retrieve a study model from an orthanc instance id.
             */
            getByInstanceId: getByInstanceId,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvStudyManager
             * 
             * @name osimis.StudyManager#getBySeriesId
             *
             * @param {string} id
             * The webviewer series id.
             * 
             * @return {Promise<osimis.Study>}
             * The Osimis Study Model.
             * 
             * @description
             * Retrieve a study model from a webviewer series id.
             */
            getBySeriesId: getBySeriesId,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvStudyManager
             * 
             * @name osimis.StudyManager#getAllStudyIds
             *
             * @return {Promise<Array<string>>}
             * The list of the study ids.
             * 
             * @description
             * Retrieve the list of all available study ids from Orthanc. This
             * basically return the content of the `<orthanc>/studies` route.
             */
            getAllStudyIds: getAllStudyIds,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvStudyManager
             * 
             * @name osimis.StudyManager#getRelatedStudyIds
             *
             * @param {Array<string>} studyIds
             * A list of Orthanc study ids.
             *
             * @return {Promise<Array<string>>}
             * The list of the related study ids, including the ones set as
             * input.
             *
             * @description
             * Retrieve the list of all study ids related to one or multiple
             * studies. This is done by checking the patients of the input
             * studies, and returning all the studies of those patients.
             */
            getRelatedStudyIds: getRelatedStudyIds,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvStudyManager
             * 
             * @name osimis.StudyManager#getPatientStudyIds
             *
             * @param {string} id
             * The Orthanc id of the patient.
             *
             * @return {Promise<Array<string>>}
             * The list of the study ids.
             *
             * @description
             * Retrieve the list of all study ids related to one single
             * patient.
             */
            getPatientStudyIds: getPatientStudyIds,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvStudyManager
             * 
             * @name osimis.StudyManager#loadStudy
             *
             * @param {string} id
             * Id of the study.
             * 
             * @description
             * Load a study and preload its annotations and all its images
             * binaries. Be sure to call `#abortStudyLoading` when you change
             * the study.
             */
            loadStudy: loadStudy,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvStudyManager
             * 
             * @name osimis.StudyManager#abortStudyLoading
             *
             * @param {string} id
             * Id of the study.
             * 
             * @description
             * Stop preloading study images / instance tags / ...
             */
            abortStudyLoading: abortStudyLoading
        };

        ////////////////

        // Cache of study models.
        var _studies = {};

        function get(id) {
            var _this = this;

            // If model is not available in cache yet, generate it.
            if (!_studies[id]) {
                var request = new osimis.HttpRequest();
                request.setHeaders(wvConfig.httpRequestHeaders);
                request.setCache(true);

                _studies[id] = request
                    .get(wvConfig.orthancApiURL + '/studies/' + id)
                    .then(function (response) {
                        var data = response.data;

                        var tags = _.merge(
                            {},
                            data.MainDicomTags,
                            data.PatientMainDicomTags
                        );

                        // load series via the wvSeriesManager to get the right postfix in the seriesId
                        // in order to get consistent with the multiFrame instances
                        // (for example: used to get the eye symbol for the viewedSeriesId array in the paneManager)
                        
                        // Series
                        // Pdf
                        // Video

                        // Update video & pdf instance ids (once the series 
                        // have been loaded since the series manager request 
                        // will load the pdf instances too in one single HTTP
                        // request).
                        return $q.all({
                            videoIds: /* @todo vm.videoDisplayEnabled && */ $q.all(wvVideoManager.listInstanceIdsFromOrthancStudyId(id)),
                            pdfInstances: $q.all(wvPdfInstanceManager.listFromOrthancStudyId(id)),
                            series: wvSeriesManager.listFromOrthancStudyId(id)
                        })
                        .then(function(data) {
                            var seriesIds = data.series.map(function(series){
                                return series.id;
                            });
                            var videoIds = data.videoIds;
                            var pdfInstanceIds = _.keys(data.pdfInstances).length && data.pdfInstances.map(function(pdfInstance) {
                                return pdfInstance.id;
                            });
                            if(pdfInstanceIds === 0){
                                pdfInstanceIds = [];
                            }

                            var newStudy = new osimis.Study(
                                $q,
                                _this,
                                wvSeriesManager,
                                id,
                                tags,
                                seriesIds,
                                pdfInstanceIds,
                                videoIds
                            );

                            return newStudy;
                        });
                    });
            }

            // Return model.
            return _studies[id];
        }

        function getByInstanceId(id) {
            var _this = this;
            var request = new osimis.HttpRequest();
            request.setHeaders(wvConfig.httpRequestHeaders);
            request.setCache(true);

            return request
                .get(wvConfig.orthancApiURL + '/instances/' + id + '/study')
                .then(function(response) {
                    var studyId = response.data.ID;
                    return _this.get(studyId);
                });
        }

        function getBySeriesId(id) {
            var _this = this;

            // Retrieve orthanc series id from webviewer series id.
            var orthancSeriesId = id.split(':')[0];
            
            var request = new osimis.HttpRequest();
            request.setHeaders(wvConfig.httpRequestHeaders);
            request.setCache(true);

            return request
                .get(wvConfig.orthancApiURL + '/series/' + orthancSeriesId + '/study')
                .then(function(response) {
                    var studyId = response.data.ID;
                    return _this.get(studyId);
                });
        }

        function getAllStudyIds() {
            var request = new osimis.HttpRequest();
            request.setHeaders(wvConfig.httpRequestHeaders);
            request.setCache(false);

            return request
                .get(wvConfig.orthancApiURL + '/studies/')
                .then(function(response) {
                    return response.data;
                });
        }

        function getRelatedStudyIds(studyIds) {
            // 1. Retrieve the patients of all study ids set in input.
            var patientIdsPromises = studyIds
                .map(function(studyId) {
                    var request = new osimis.HttpRequest();
                    request.setHeaders(wvConfig.httpRequestHeaders);
                    request.setCache(false);
                    return request
                        .get(wvConfig.orthancApiURL + '/studies/' + studyId)
                        .then(function(result) {
                            return result.data.ParentPatient;
                        });
                });

            var relatedStudyIdsPromise = $q
                // 2. Wait till' we have all the patients' information.
                .all(patientIdsPromises)

                // 3. Remove duplicates patient ids.
                .then(function(patientIds) {
                    return _.intersection(patientIds);
                })

                // 4. Retrieve all the studies from those patients.
                .then(function(patientIds) {
                    var studyIdsPromises = patientIds
                        .map(function(patientId) {
                            return service
                                .getPatientStudyIds(patientId);
                        });

                    return $q.all(studyIdsPromises);
                })

                // 5. Flatten the array (there is at the moment one array of
                // study ids for each patients, we want one array for every 
                // study instead).
                .then(function(arraysOfRelatedStudyIds) {
                    return _.flatten(arraysOfRelatedStudyIds);
                })

                // 6. Remove duplicate studies (probably useless, since one
                // study can't belong to more than one patient).
                .then(function(relatedStudyIds) {
                    return _.intersection(relatedStudyIds);
                });

            // 6. Return the result.
            return relatedStudyIdsPromise;
        }

        function getPatientStudyIds(id) {
            var request = new osimis.HttpRequest();
            request.setHeaders(wvConfig.httpRequestHeaders);
            request.setCache(false);

            return request
                .get(wvConfig.orthancApiURL + '/patients/' + id)
                .then(function(response) {
                    return response.data.Studies;
                });
        }

        function loadStudy(id) {
            // Preload study images / instance tags / ...
            // @todo Call function instead of relying on event
            $rootScope.$emit('UserSelectedStudyId', id);
        }

        function abortStudyLoading(id) {
            // Stop preloading study images / instance tags / ...
            // @todo Call function instead of relying on event
            $rootScope.$emit('UserUnSelectedStudyId', id);
        }

        return service;
    }
})();