/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.Image
 *
 * @description
 * This contains image id, tags, annotations & binaries.
 * an image either account for a DICOM instance (if the instance is monoframe), or a frame.
 */
(function(module) {
    'use strict';

    /**
     * @constructor osimis.Image
     */
    function Image(imageBinaryManager, annotationManager, // injected values
                   id, instanceInfos, availableQualities, postProcesses
    ) {
        var _this = this;

        this._imageBinaryManager = imageBinaryManager;
        this._annotationManager = annotationManager;

        this.id = id;
        this.instanceInfos = instanceInfos;
        this._availableQualities = availableQualities;

        // collection of postprocesses
        this.postProcesses = postProcesses || [];

        this.onAnnotationChanged = new osimis.Listener();
        this.onBinaryLoaded = new osimis.Listener();

        this._feedAnnotationChangedEvents(this);
        this._feedBinaryLoadedEvents(this);
    }

    Image.prototype._feedAnnotationChangedEvents = function(imageModel) {
        this._annotationManager.onAnnotationChanged(function(annotation) {
            // filter events that are related to this image
            if (annotation.imageId !== imageModel.id) return;

            // propagate event
            imageModel.onAnnotationChanged.trigger(annotation);
        });

        // @todo need to be destroyed on no listener anymore
    };

    Image.prototype._feedBinaryLoadedEvents = function(imageModel) {
        this._imageBinaryManager.onBinaryLoaded(function(id, qualityLevel, cornerstoneImageObject) {
            // filter events that are related to this image
            if (id !== imageModel.id) return;

            // propagate event
            imageModel.onBinaryLoaded.trigger(qualityLevel, cornerstoneImageObject);
        });

        // @todo need to be destroyed on no listener anymore
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#getAvailableQualities
     * @return {Array<object>} Available qualities as a {<string>: <int>} array
     */
    Image.prototype.getAvailableQualities = function() {
        return this._availableQualities;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#getAnnotations
     * @param {string} type Annotation tool's name.
     * @return {Array<object>} cornerstoneTools' annotation array for one
     *                         instance.
     */
    Image.prototype.getAnnotations = function(type) {
        return this._annotationManager.getByImageId(this.id, type);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#setAnnotations
     * 
     * @param {string} type
     * Annotation tool's name
     * 
     * @param {object} data
     * CornerstoneTools' annotation array for one instance
     *
     * @param {boolean} [setByEndUser=false]
     * Set this variable when the annotations are set by the end users (by
     * clicking with the mouse on a canvas with a tool for instance) in
     * contrast to annotations retrieved from an external source. When set to
     * true, we know we have to store the annotation in the backend. When set
     * to false, we can avoid an useless request.
     */
    Image.prototype.setAnnotations = function(type, data, setByEndUser) {
        setByEndUser = setByEndUser || false;
        var annotation = new osimis.AnnotationValueObject(type, this.id, data);
        this._annotationManager.set(annotation, setByEndUser);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#onAnnotationChanged
     * @param {callback} callback
     *    Called when one image's annotation has changed
     * 
     *    Parameters:
     *    * {object} `annotation` The modified annotation (WvAnnotationValueObject)
     */
    Image.prototype.onAnnotationChanged = angular.noop;

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#loadBinary
     * @param {osimis.quality} desiredQualityLevel Binary quality as an integer.
     * @return {Promise<object>} cornerstoneImageObject,
     *         See https://github.com/chafey/cornerstone/wiki/image
     */
    Image.prototype.loadBinary = function(quality) {
        return this._imageBinaryManager.get(this.id, quality);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#freeBinary
     * @param {osimis.quality} quality The quality level of the binary to be
     *                                 freed as an integer.
     *
     * @description
     * Free binary memory - note it doesn't mean the cache will be freed
     * as the cache logic is implemented by the image-binary-manager (and
     * probably work with reference counting and other specific mechanisms).
     */
    Image.prototype.freeBinary = function(quality) {
        this._imageBinaryManager.free(this.id, quality);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#abortBinaryLoading
     * @param {osimis.quality} quality The quality level of the binary to be
     *                                 freed as an integer
     *
     * @description
     * Alias of freeBinary (if a request is pending, it's automaticaly canceled
     * before its freed).
     */
    Image.prototype.abortBinaryLoading = function(quality) {
        this._imageBinaryManager.free(this.id, quality);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#getBestQualityInCache
     * 
     * @return {osimis.Quality}
     * The best level of quality already loaded.
     */
    Image.prototype.getBestQualityInCache = function() {
        return this._imageBinaryManager.getBestQualityInCache(this.id);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#getBestBinaryInCache
     *
     * @return {Promise<object>}
     * A promise containing a Cornerstone ImageObject of the image's
     * best-quality binary or an empty promise if no binary has been
     * loaded yet.
     * See `https://github.com/chafey/cornerstone/wiki/image` for the
     * interface.
     */
    Image.prototype.getBestBinaryInCache = function() {
        return this._imageBinaryManager.getBestBinaryInCache(this.id);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Image
     * 
     * @name osimis.Image#onBinaryLoaded
     * @param {callback} callback
     *    Called when a new binary has been loaded
     * 
     *    Parameters:
     *    * {osimis.quality} `qualityLevel` The quality of the loaded binary
     *    * {object} `annotation` The modified annotation (WvAnnotationValueObject)
     */
    Image.prototype.onBinaryLoaded = function() { /* noop */ };

    module.Image = Image;

    angular
        .module('webviewer')
        .factory('WvImage', factory);

    /* @ngInject */
    function factory(wvImageBinaryManager, wvAnnotationManager) {
        // Create and inject inject module
        return module.Image.bind(module, wvImageBinaryManager, this._annotationManager);
    }

})(this.osimis || (this.osimis = {}));