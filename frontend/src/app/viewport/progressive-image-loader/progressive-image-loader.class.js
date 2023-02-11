/**
 * @ngdoc object
 * @memberOf osimis
 *
 * @name osimis.ProgressiveImageLoader
 * @param {osimis.Image} image The image model to download quality from
 * @param {Array<osimis.quality>} qualities The array of quality to be downloaded
 *
 * @description
 * The `ProgressiveImageLoader` class manage image resolution
 * loading (and loading abortion) for a viewport.
 *
 * It load multiple resolutions and make sure they are displayed
 * in order of quality.
 *
 * It is not the role of this class to handle resolution display changes & adaptions:
 * On each resolution change, the cornerstone annotations should be converted.
 * It's however not the role of this class since it requires drawing of the image
 * (to do otherwise could implies multiple useless redraw of the same binary).
 * The onBinaryLoaded event is here to help us concerning the drawing.
 */
(function(osimis) {
    'use strict';

    /**
     * @constructor osimis.ProgressiveImageLoader
     */
    function ProgressiveImageLoader(Promise, image, qualities) {
        this._Promise = Promise;
        this._image = image;
        this._qualities = qualities;

        this.onBinaryLoaded = new osimis.Listener(); // quality, cornerstoneImageObject
        this.onLoadingFailed = new osimis.Listener(); // quality, err

        // Used to be able to abort loadings when we change the displayed image
        this._binariesInLoading = [];

        // Store the last loaded image quality to free memory at each new reoslution loading.
        // Note the last loaded image may not be the last shown image
        // (for instance if the last loaded image has lower quality than the last
        // shown image)
        this._lastLoadedImageQuality = null;

        // Memory allocation is hard to grasp in this class.
        // There is 4 ways a binary reference may be decreased by the
        // `ProgressiveImageLoader`:
        // 1. We decr. loaded LQ binary because we don't need it. It happens
        //    when HQ is loaded before LQ.
        // 2. We decr. loaded LQ binary because we don't need it. It also
        //    happens when HQ is loaded after LQ.
        // 3. We decr. currently loaded image's binary when the
        //    `ProgressiveImageLoader` is destroyed (when the image changes for
        //    instance, see `#abortBinariesLoading`).
        // 4. We decr. in-loading image's binaries when the
        //    `ProgressiveImageLoader` is destroyed (when the image changes for
        //    instance, see `#abortBinariesLoading`).
        // 5. We decr. binaries which have failed to load.
        //
        // The fifth point may also be triggered by the four previous ones
        // (except when the preloader still hold instances of the binary).
        // Therefore, ref. may be decreased twice!
        //
        // To prevent this from happening, we also keep track of decr. binaries.
        this._destroyedQualities = [];
    }

    /**
     * @ngdoc method
     * @methodOf osimis.ProgressiveImageLoader
     *
     * @name osimis.ProgressiveImageLoader#loadBinaries
     *
     * @description
     * Pregressivily load all the image binaries defined fromù the qualities
     * set in the constructor.
     * Trigger `onBinaryLoaded` and `onLoadingFailed` events.
     */
    ProgressiveImageLoader.prototype.loadBinaries = function() {
        var _this = this;
        var Promise = this._Promise;
        var image = this._image;
        var qualities = this._qualities;
        var binariesInLoading = this._binariesInLoading;
        var destroyedQualities = this._destroyedQualities;

        // Request load of the binaries of each processed image
        qualities.forEach(function(quality) {
            // Load the binary
            var promise = image.loadBinary(quality);

            // Save the loaded quality to be able to cancel the loading request if the displayer is destroyed
            binariesInLoading.push(quality);

            // On loaded, call the callback
            promise.then(function(cornerstoneImageObject) {
                // The binary has been loaded

                // Ignore lower resolution than if an higher one has already been loaded
                // to ensure the maximum quality to stay displayed and free the memory
                // of the inferior quality image
                if (_this._lastLoadedImageQuality > quality) { // Keep ref using `_this. due to asynchronicity
                    return Promise.reject(new Error('LQ Loaded after HQ'));
                    // @note Things will be cleaned in `.then(null, function(err) { .. })`
                }
                // Decr. ref of previous downloaded binary (when its quality is the lowest one)
                else if (_this._lastLoadedImageQuality) {
                    if (destroyedQualities.indexOf(_this._lastLoadedImageQuality) === -1) {
                        image.freeBinary(_this._lastLoadedImageQuality);
                        destroyedQualities.push(_this._lastLoadedImageQuality);
                    }
                }

                // Update last downloaded image reference so it can be freed later
                _this._lastLoadedImageQuality = quality;

                // @todo Abort lower resolution's loading

                // Remove the binary from the binariesInLoading queue (used to be able to cancel the loading request)
                _.pull(binariesInLoading, quality);

                // Call the "binary has loaded" callback
                // @warning Take care.. All callback's exceptions are swallowed by the current promise
                _this.onBinaryLoaded.trigger(quality, cornerstoneImageObject);
            })
            .then(null, function(err) {
                // Decrease failed binary's ref. count
                if (destroyedQualities.indexOf(quality) === -1) {
                    image.freeBinary(quality);
                    destroyedQualities.push(quality);
                }

                // Remove the binary from the binariesInLoading queue (used to be able to cancel the loading request)
                _.pull(binariesInLoading, quality);

                // Call loading cancelled callback when it's not normal behavior
                _this.onLoadingFailed.trigger(quality, err);
                if (err.message !== 'LQ Loaded after HQ') {
                //    _this.onLoadingFailed.trigger(quality, err);
                }
                else {
                    // Forward the rejection
                    // return Promise.reject(err);
                }
            });

        });
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ProgressiveImageLoader
     *
     * @name osimis.ProgressiveImageLoader#onBinaryLoaded
     *
     * @param {callback} callback
     *    Called when a binary has been loaded.
     *
     *    Parameters:
     *    * {osimis.quality} `quality` The quality of the binary.
     *    * {object} `cornerstoneImageObject` The cornerstone image object of
     *                                        the loaded binary.
     */
    ProgressiveImageLoader.prototype.onBinaryLoaded = null;

    /**
     * @ngdoc method
     * @methodOf osimis.ProgressiveImageLoader
     *
     * @name osimis.ProgressiveImageLoader#onLoadingFailed
     *
     * @param {callback} callback
     *    Called when a loading as failed. Ignored loaded images are not
     *    considered as failed loadings (a LQ binary is ignored when loaded
     *    after a HQ binary for instance).
     *
     *    Parameters:
     *    * {osimis.quality} `quality` The quality of the binary.
     *    * {Error} `err` The thrown javascript error.
     */
    ProgressiveImageLoader.prototype.onLoadingFailed = null;

    /**
     * @ngdoc method
     * @methodOf osimis.ProgressiveImageLoader
     *
     * @name osimis.ProgressiveImageLoader#abortBinariesLoading
     *
     * @description
     * Abort current binaries' loading. Mostly called by the `#destroy`
     * method.
     */
    ProgressiveImageLoader.prototype.abortBinariesLoading = function() {
        var image = this._image;
        var destroyedQualities = this._destroyedQualities;

        // Cancel binary loading requests
        this._binariesInLoading.forEach(function(quality) {
            // try {
                // Decrease in-loading binaries' ref count.
                if (destroyedQualities.indexOf(quality) === -1) {
                    image.freeBinary(quality);
                    destroyedQualities.push(quality);
                }
            // }
            // catch(exc) {
                // Ignore exceptions: they may be caused because
                // we try to free a binary whose download has been
                // successfuly cancelled by the binary manager but not
                // yet been removed from _binariesInLoading.
                // @todo check this theory w/ chrome timeline
                // @todo unit test
            // }
        });
        this._binariesInLoading = [];

        // Decrease currently displayed image binary ref count
        var image = this._image;
        if (this._lastLoadedImageQuality) {
            if (destroyedQualities.indexOf(this._lastLoadedImageQuality) === -1) {
                try {
                    image.freeBinary(this._lastLoadedImageQuality);
                }
                catch(e) {
                    // Rethrow exception in another code flow, so an
                    // exception doesn't prevent the code from working
                    // (useful when debugging).
                    setTimeout(function() {
                        throw e;
                    });
                }

                destroyedQualities.push(this._lastLoadedImageQuality);
            }
            image = null;
            this._lastLoadedImageQuality = null;
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ProgressiveImageLoader
     *
     * @name osimis.ProgressiveImageLoader#destroy
     *
     * @description
     * Abort current binaries' loading and close `onBinaryLoaded` and
     * `onLoadingFailed` listeners.
     */
    ProgressiveImageLoader.prototype.destroy = function() {
        this.abortBinariesLoading();

        // Free events
        this.onBinaryLoaded.close();
        this.onLoadingFailed.close();
    };

    osimis.ProgressiveImageLoader = ProgressiveImageLoader;

})(this.osimis || (this.osimis = {}));
