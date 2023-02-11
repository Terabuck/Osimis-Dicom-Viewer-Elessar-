/**
 * @ngdoc service
 *
 * @name webviewer.service:wvVideoManager
 *
 * @description
 * The `wvVideoManager` provide information relative to video at the
 * instance level.
 */
(function(osimis) {
    'use strict';

    angular
        .module('webviewer')
        .factory('wvVideoManager', wvVideoManager);

    /* @ngInject */
    function wvVideoManager($q, wvConfig) {
        var service = {
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvVideoManager
             * 
             * @name osimis.VideoManager#get
             * 
             * @param {string} instanceId
             * Id of the DICOM instance embedding the PDF (in the orthanc
             * format).
             * 
             * @return {Promise<osimis.Video>}
             * The `osimis.Video` model.
             * 
             * @description
             * Retrieve a promise of the model by it's id.
             */
            get: get,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvVideoManager
             * 
             * @name osimis.VideoManager#listFromOrthancStudyId
             * 
             * @param {string} studyId
             * Id of the study (in the orthanc format).
             * 
             * @return {Array<Promise<osimis.Video>>}
             * A list of video models.
             * 
             * @description
             * Retrieve a list of video from a backend study id.
             * Used mainly to display video in the `wvSerieslist`.
             *
             * warning: Only call this method once the video have already been
             * defined by the `wvSeriesManager` in the `/osimis-viewer/series`
             * route.
             */
            listInstanceIdsFromOrthancStudyId: listInstanceIdsFromOrthancStudyId,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvVideoManager
             *
             * @name osimis.VideoManager#setVideoInstanceIdsForStudyId
             * 
             * @param {string} studyId
             * Id of the study (in orthanc format) containing the DICOM 
             * instance of the video.
             * 
             * @param {string} seriesId
             * Id of the series (in vw format) containing the DICOM instance of
             * the video.
             * 
             * @param {string} instanceId
             * The id of the DICOM instance (in orthanc format) containing the
             * video.
             *
             * @param {object} instanceTags
             * An hashmap containing the DICOM tags of the instance.
             * 
             * @param {string} contentType
             * The type of the video. Can either be,
             * 
             * * `video/mpeg2`
             * * `video/mpeg4`
             * * `video/mpeg4-bd`
             *
             * Helpful to check if the required video codec is supported by the
             * current platform.
             * 
             * @description
             * Set a video instance .
             * 
             * Used mainly for optimization: retrieving all the pdf instances
             * tags at one single request within the `wvSeriesManager` instead
             * of many requests for each instances. Indeed, a full dicom file
             * has to be loaded to retrieve additional DICOM tags. As the
             * backend doesn't have its own database to cache these kind of
             * information, we rely on Orthanc's one and use a single request
             * instead.
             */
            setVideoInstanceIdsForStudyId: setVideoInstanceIdsForStudyId
        };

        /**
         * @type {object}
         * * keys: instance ids
         * * values: Array of pdf instance promises
         * * format: {<orthancStudyId>: Array<Promise<osimis.Video>>, ...}
         *
         * @description
         * Cache video instance id by studyId when a series is loaded, because
         * all instances' tags are only retrieved in one single series http 
         * request to avoid unnecessary http requests.
         */
        var _videoInstancesByStudyId = {};

        /**
         * @type {object}
         * * keys: instance ids
         * * values: Video promises
         * * format: {<orthancInstanceId>: Promise<osimis.Video>, ...}
         *
         * @description
         * Cache video models by instanceId when a series is loaded, because 
         * all instances' tags are only retrieved in one single series http 
         * request to avoid unnecessary http requests.
         */
        var _videoInstancesByInstanceId = {};

        return service;

        ////////////////

        function get(instanceId) {
            // Throw exception if video not found
            if (!_videoInstancesByInstanceId[instanceId]) {
                throw new Error('Video not found `' + instanceId + '`.');
            }

            // Return otherwise
            return _videoInstancesByInstanceId[instanceId];
        }

        function listInstanceIdsFromOrthancStudyId(studyId) {
            return _videoInstancesByStudyId[studyId] || [];
        }

        function setVideoInstanceIdsForStudyId(studyId, instanceId, instanceInfos, contentType) {
            // Don't double cache instance.
            if (_videoInstancesByInstanceId[instanceId]) {
                return;
            }

            // Create model based on the data.
            var video = new osimis.Video(
                wvConfig,
                instanceId,
                instanceInfos.TagsSubset,
                contentType
            );

            // Always wrap models in a promise to stay consistent with the API.
            var videoPromise = $q.when(video);

            // Reference the model based on its related studyId and instanceId.
            _videoInstancesByStudyId[studyId] = _videoInstancesByStudyId[studyId] || [];
            _videoInstancesByStudyId[studyId].push(videoPromise);

            _videoInstancesByInstanceId[instanceId] = videoPromise;
        }
    }
})(this.osimis || (this.osimis = {}));