/**
 * @ngdoc service
 *
 * @name webviewer.service:wvImageManager
 *
 * @description
 * Manage high-level image models.
 * An image correspond to a monoframe instance or to the frame of a multiframe
 * instance. One image may have multiple binaries (one by quality).
 * 
 * Available qualities may change from one instance to another within the same
 * series.
 */
(function(osimis) {
    'use strict';

    function ImageManager(instanceManager, imageBinaryManager, annotationManager, config) {
        this._instanceManager = instanceManager;
        this._imageBinaryManager = imageBinaryManager;
        this._annotationManager = annotationManager;
        this._config = config; // so we can retrieve http request headers

        this._postProcessorClasses = {};

        // @todo flush
        this._modelCache = {};

        /** _availableQualities
         *
         * Cache available qualities by instanceId when a series is loaded,
         * because all images' available qualities are only retrieved in one single series http request
         * to avoid unnecessary http requests (since retrieve available qualities involve opening the dicom
         * file to check the DICOM tag).
         */
        // @todo flush
        this._availableQualities = {}; // _availableQualities[instanceId] = series.availableQualities
    }

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageManager
     *
     * @name osimis.ImageManager#get
     * 
     * @param {string} id Id of the image (<instance-id>:<frame-index>)
     * @return {Promise<osimis.Image>} The image model's promise
     *
     * @description
     * Retrieve an image model by id.
     * 
     * # @pre The image's series has been loaded via wvSeriesManager
     */
    ImageManager.prototype.get = function(id) {
        if (id == null) {
          return Promise.resolve(null);
        }

        var instanceManager = this._instanceManager;
        var postProcessorClasses = this._postProcessorClasses;
        var modelCache = this._modelCache;
        var availableQualities = this._availableQualities;
        var _this = this;

        if (!modelCache.hasOwnProperty(id)) {
            // Split between image id and postProcesses
            var splitted = id.split('|');
            id = splitted[0];
            var postProcessesStrings = splitted.splice(1);
            var postProcesses = postProcessesStrings.map(function (processString) {
                // Split processString between process name and its arguments
                splitted = processString.split('~');
                var processName = splitted[0];
                var processArgs = splitted.splice(1);

                if (!postProcessorClasses.hasOwnProperty(processName)) {
                    throw new Error('wv-image: unknown post processor');
                }
                
                var postProcessObject = new (Function.prototype.bind.apply(postProcessorClasses[processName], [null].concat(processArgs)));
                return postProcessObject;
            });

            // Split between dicom instance id and frame index
            splitted = id.split(':');
            var instanceId = splitted[0];
            var frameIndex = splitted[1] || 0;

            // Retrieve available qualities
            var availableQualities = availableQualities[instanceId];
            if (!availableQualities) {
                throw new Error("Image availableQualities is unavalaible: image's series has not been loaded.");
            }
            
            // Create & return image model based on request results
            modelCache[id] = instanceManager
                .getInfos(instanceId)
                .then(function(infos) {
                    return new osimis.Image(_this._imageBinaryManager, _this._annotationManager,
                        id, infos, availableQualities, postProcesses);
                });
        };

        return modelCache[id];
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageManager
     *
     * @name osimis.ImageManager#cacheAvailableQualitiesForInstance
     * 
     * @param {string} instanceId Id of the instance
     * @param {Array<osimis.quality>} availableQualities 
     *    List of the current instance's qualities available for download.
     *
     * @description
     * Cache available qualities by instanceId when a series is loaded, because
     * all images' available qualities are only retrieved in one single series
     * http request to avoid unnecessary http requests.
     */
    ImageManager.prototype.cacheAvailableQualitiesForInstance = function(instanceId, availableQualities) {
        this._availableQualities[instanceId] = availableQualities;
    }

    /**
     * Register a post processor
     *
     * @depracated
     */
    ImageManager.prototype.registerPostProcessor = function(name, PostProcessor) {
        var postProcessorClasses = this._postProcessorClasses;

        postProcessorClasses[name] = PostProcessor;
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageManager
     *
     * @name osimis.ImageManager#captureViewportAsKeyImage
     * 
     * @param {string} imageId
     * Id of the image (<instance-id>:<frame-index>)
     * 
     * @param {int} width
     * Width of the output
     * 
     * @param {int} height
     * Height of the output
     *
     * @param {string} note
     * a note to store in OsimisNote private tag
     *
     * @param {object} [serializedCsViewport=null]
     * The cornerstone viewport object of the image. This viewport
     * defines the windowing, paning, ... settings of the image.
     * See cornerstone documentation for interface specification.
     * 
     * @return {Promise<string>}
     * A data64 string containing the image in 96 dpi png.
     *
     * @description
     * Creates a new DICOM series is created with the image of the viewport,
     * including the annotations. This image is considered as a DICOM Key 
     * Image Note (see `http://wiki.ihe.net/index.php/Key_Image_Note`).
     * 
     * @todo move in @RootAggregate (ie. image-model)
     */
     ImageManager.prototype.captureViewportAsKeyImage = function(imageId, width, height, note, serializedCsViewport) {

        var instanceManager = this._instanceManager;
        var config = this._config;
        var studyId = undefined;

        return this
            // Create annoted image.
            .createAnnotedImage(imageId, width, height, serializedCsViewport, "image/png", true, 1)
            // Prepare new dicom tags for captured image.
            .then(function(b64PixelData) {
                var instanceId = imageId.split(':')[0];

                // Takes original instance's dicom tags, and add the PixelData.
                return instanceManager
                    .getInfos(instanceId)
                    .then(function(infos) {
                        // Clone tags to ensure we don't corrupt them (they may
                        // be passed by reference).
                        //var tags = _.cloneDeep(infos.TagsSubset);
                        var tags = {};

                        // Use KO as a modality, as requested by the client.
                        tags.Modality = 'KO';
                        tags.SOPClassUID = '1.2.840.10008.5.1.4.1.1.88.59',
                        tags.SeriesDescription = '*' + tags.SeriesDescription,
                        tags.OsimisNote = note

                        // Retrieve study Id
                        return instanceManager
                            .getParentStudyId(instanceId)
                            .then(function(studyIdFromResponse) {
                                studyId = studyIdFromResponse;
                                // Return POST request body.
                                return {
                                    Tags: tags,
                                    Content: b64PixelData,
                                    Parent: studyId
                                };
                            });
                    });
            })
            // Create new DICOM from captured image.
            .then(function(requestBody) {
                var req = new osimis.HttpRequest();
                req.setHeaders(config.httpRequestHeaders);
                return req.post(config.orthancApiURL + '/tools/create-dicom', requestBody)
            })
            // Retrieve new DICOM id.
            .then(function(resp) {
                var id = resp['ID'];
                return {'ID': id, Parent: studyId}
            });
    };

    osimis.ImageManager = ImageManager;

    angular
        .module('webviewer')
        .factory('wvImageManager', wvImageManager);

    /* @ngInject */
    function wvImageManager($rootScope, $q, $compile, $timeout, wvInstanceManager, wvImageBinaryManager, wvAnnotationManager, wvConfig) {
        var imageManager = new ImageManager(wvInstanceManager, wvImageBinaryManager, wvAnnotationManager, wvConfig);

        // Cache available binary qualities for instance
        $rootScope.$on('SeriesHasBeenLoaded', function(evt, series) {
            var instanceIds = series.listInstanceIds();
            instanceIds.forEach(function(instanceId) {
                imageManager.cacheAvailableQualitiesForInstance(instanceId, series.availableQualities);
            });
        });

        /**
         * @ngdoc method
         * @methodOf webviewer.service:wvImageManager
         *
         * @name osimis.ImageManager#createAnnotedImage
         * 
         * @param {string} id
         * Id of the image (<instance-id>:<frame-index>)
         * 
         * @param {int} width
         * Width of the output
         * 
         * @param {int} height
         * Height of the output
         *
         * @param {object} [serializedCsViewport=null]
         * The cornerstone viewport object of the image. This viewport
         * defines the windowing, paning, ... settings of the image.
         * See cornerstone documentation for interface specification.
         * 
         * @return {Promise<string>}
         * A data64 string containing the image in 96 dpi png.
         *
         * @description
         * Retrieve an image picture from an image id.
         * 
         * @todo move in @RootAggregate (ie. image-model)
         */
        imageManager.createAnnotedImage = function(id, width, height, serializedCsViewport, contentType, limitSize, compressionRatio) {
            // create a fake viewport containing the image to save it with the annotations

            // create a fake scope for the viewport
            var $scope = $rootScope.$new();

            var pixelsCount = width * height;
            var maxPixelsCount = 1*1024*1024;
            var scaling = 1;
            if (pixelsCount > maxPixelsCount && (limitSize || wvConfig.browser.browser.name !== "Chrome")) {  // even on Firefox 67, we have seen that canvas.toDataUrl was not working with 3000x4000 images
              var ratio = Math.sqrt(pixelsCount / maxPixelsCount);
              width = Math.round(width / ratio);
              height = Math.round(height / ratio);
              console.log("limiting the size of the capture to (" + width + "x" + height + ")");
              scaling = 1 / ratio;
            }

            $scope.size = {
                width: width + 'px',
                height: height + 'px'
            };
            $scope.imageId = id;
            
            var csViewportData = {
                invert: serializedCsViewport.csViewportData.invert,
                hflip: false,
                vflip: false,
                scale : scaling,
                translation: {x : 0, y : 0},
                rotation: serializedCsViewport.csViewportData.rotation,
                modalityLUT: undefined,
                voiLUT: undefined,
                voi: {
                    windowWidth: serializedCsViewport.csViewportData.voi.windowWidth,
                    windowCenter: serializedCsViewport.csViewportData.voi.windowCenter
                },
                imageResolution : {
                    width: width,
                    height: height
                }
            };
            $scope.csViewport = new osimis.CornerstoneViewportWrapper(serializedCsViewport.imageResolution, serializedCsViewport.imageResolution, csViewportData, width, height, null); 

            var fakeViewportId = "FAKE-VIEWPORT-USED-IN-IMAGE-SERVICE-" + Math.floor(Math.random() * 1000000000);

            var fakeViewport = $compile([
                '<wv-viewport id="' + fakeViewportId + '"',
                    'wv-image-id="imageId"',
                    'wv-viewport="csViewport"',
                    'wv-size="size"',
                    'wv-lossless="true"',

                    'wv-angle-measure-viewport-tool="true"',
                    'wv-simple-angle-measure-viewport-tool="true"',
                    'wv-length-measure-viewport-tool="true"',
                    'wv-elliptical-roi-viewport-tool="true"',
                    'wv-zoom-viewport-tool="true"',
                    'wv-pan-viewport-tool="true"',
                    'wv-pixel-probe-viewport-tool="true"',
                    'wv-rectangle-roi-viewport-tool="true"',
                    'wv-arrow-annotate-viewport-tool="true"',
    //                    'wv-invert-contrast-viewport-tool="???"',
                    'wv-orientation-marker-viewport-tool',
                '>',
                '</wv-viewport>'
            ].join('\n'))($scope);

            // append the element to the body as it is required to define its size
            // make sure it's harmless
            var body = $('body');
            var _oldBodyOverflow = body.css('overflow');
            body.css('overflow', 'hidden');
            fakeViewport.css('position$', 'absolute');
            fakeViewport.css('left', '-50000px');
            body.append(fakeViewport);

            function _destroyFakeViewport() {
                // revert body state
                body.css('overflow', _oldBodyOverflow);
                
                // remove element from body
                $('#' + fakeViewportId).remove();

                // destroy useless scope
                $scope.$destroy();
            }


            // wait for the fakeViewport to have digested
            return $q(function(resolve, reject) {
                $timeout(function() {
                    var image = null;

                    // save the image to base64 data (96 dpi)
                    var canvas = fakeViewport.find('canvas').get(0);
                    
                    image = canvas.toDataURL(contentType, compressionRatio);

                    _destroyFakeViewport();

                    resolve(image);
                }, 1000);  // we had to introduce this 1000ms delay for Firefox (dicom image was not loaded and rendered image was all black)
            })
        };


        return imageManager;
    };


})(this.osimis || (this.osimis = {}));