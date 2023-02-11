/**
 * @ngdoc service
 *
 * @name webviewer.service:wvPdfInstanceManager
 *
 * @description
 * The `wvPdfInstanceManager` provide information relative to image at the
 * instance level. These are mainly the DICOM tags. It is used by the image 
 * model, to retrieve tags. Most of the time, an image == a DICOM instance, but 
 * in case of multiframe instance, one image == one DICOM frame. Therefore,
 * `wvPdfInstanceManager` is useful to cache things at the instance level.
 */
(function(osimis) {
    'use strict';

    angular
        .module('webviewer')
        .factory('wvPdfInstanceManager', wvPdfInstanceManager);

    /* @ngInject */
    function wvPdfInstanceManager($q, wvConfig) {
        var service = {
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvPdfInstanceManager
             * 
             * @name osimis.wvPdfInstanceManager#listFromOrthancStudyId
             * 
             * @param {string} id
             * Id of the study (in the orthanc format).
             * 
             * @return {Array<Promise<osimis.PdfInstance>>}
             * A list of pdf instance model (wrapped in promise).
             * 
             * @description
             * Retrieve a list of pdf instance model from a backend study id.
             * Used mainly to display reports in the `wvSerieslist`.
             *
             * * @warning Only call this method once the pdf instances have
             *   already been loaded by the `wvSeriesManager` in the 
             *   `/osimis-viewer/series` route. This is done to minimize HTTP
             *   request count (optimisation purpose).
             * 
             * * @note There is no frontend study id.
             */
            listFromOrthancStudyId: listFromOrthancStudyId,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvPdfInstanceManager
             *
             * @name osimis.wvPdfInstanceManager#getPdfBinary
             * 
             * @param {string} id
             * Id of the instance (orthanc format).
             * 
             * @return {Promise<arraybuffer>}
             * The PDF document as a blob binary.
             * 
             * @description
             * Retrieve the PDF document for a specified instance.
             */
            getPdfBinary: getPdfBinary,
            /**
             * @ngdoc method
             * @methodOf webviewer.service:wvPdfInstanceManager
             *
             * @name osimis.wvPdfInstanceManager#setPdfInstance
             * 
             * @param {string} instanceId
             * Id of the instance (in orthanc format) containing the PDF.
             * 
             * @param {object} instancesInfos
             * Hash of the instance's infos
             * 
             * @param {string} seriesId
             * Id of the series (in vw format) containing the PDF instance.
             *
             * @param {string} studyId
             * Id of the study (in orthanc format) containing the PDF instance.
             * 
             * @description
             * Set a PdfInstance model.
             * 
             * Used mainly for optimization: retrieving all the pdf instances
             * tags at one single request within the `wvSeriesManager` instead
             * of many requests for each instances. Indeed, a full dicom file
             * has to be loaded to retrieve additional DICOM tags. As the
             * backend doesn't have its own database to cache these kind of
             * information, we rely on Orthanc's one and use a single request
             * instead.
             */
            setPdfInstance: setPdfInstance
        };

        /**
         * @type {object}
         * * keys: instance ids
         * * values: Array of pdf instance promises
         * * format: {<orthancStudyId>: Array<promiseOfPdfInstanceModel>, ...}
         *
         * @description
         * Cache pdf models by studyId when a series is loaded, because all
         * instances' tags are only retrieved in one single series http request
         * to avoid unnecessary http requests.
         * 
         * * @todo Flush the content
         */
        var _pdfInstancesByStudyId = {};

        /**
         * @type {object}
         * * keys: instance ids
         * * values: Pdf Instance promises
         * * format: {<orthancInstanceId>: <promiseOfPdfInstanceModel>, ...}
         *
         * @description
         * Cache pdf models by instanceId when a series is loaded, because all
         * instances' tags are only retrieved in one single series http request
         * to avoid unnecessary http requests.
         * 
         * * @todo Flush the content
         */
        var _pdfInstancesByInstanceId = {};

        return service;

        ////////////////

        function listFromOrthancStudyId(studyId) {
            return _pdfInstancesByStudyId[studyId];
        }

        function getPdfBinary(id) {
            var request = new osimis.HttpRequest();
            request.setCache(false); // do not cache pdf binaries
            request.setHeaders(wvConfig.httpRequestHeaders);
            request.setResponseType('arraybuffer');
            return request
                .get(wvConfig.orthancApiURL + '/instances/'+id+'/pdf')
                .then(function(response) {
                    var pdfBinary = response.data;

                    return pdfBinary;
                }, function(err) {
                    // @todo uncache & do something with the error
                    
                    return $q.reject(err);
                });
        }

        function setPdfInstance(instanceId, instanceInfos, seriesId, studyId) {
            // Don't double cache instance.
            if (_pdfInstancesByInstanceId[instanceId]) {
                return;
            }

            // Create model based on the data.
            var pdfInstance = new osimis.PdfInstance(
                this,
                instanceId,
                instanceInfos.TagsSubset
            );

            // Always wrap models in a promise to stay consistant with the API.
            var pdfInstancePromise = $q.when(pdfInstance);

            // Reference the model based on its related studyId and instanceId.
            _pdfInstancesByStudyId[studyId] = _pdfInstancesByStudyId[studyId] || [];
            _pdfInstancesByStudyId[studyId].push(pdfInstancePromise);

            _pdfInstancesByInstanceId[instanceId] = pdfInstancePromise;
        }
    }
})(this.osimis || (this.osimis = {}));