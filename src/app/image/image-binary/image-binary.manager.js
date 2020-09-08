/** 
 * @ngdoc service
 *
 * @name webviewer.service:wvImageBinaryManager
 *
 * @description
 * Manage the binary loading side of images.
 *
 * As it is quite complex and requires specific caching & prefetching algorithm,
 * it is out of the standard image manager.
 *
 * Image loading shall only be aborted if it's
 * - in loading
 * - no longer in preloading criteria
 * - no longer displayed
 * so it can't ever happen with red within the same series..
 */
(function(osimis) {
    'use strict';

    function ImageBinaryManager(Promise, httpRequestHeaders, instanceManager, cornerstoneImageAdapter, cache, workerPool) {
        // Declare dependencies
        this._Promise = Promise;
        this._httpRequestHeaders = httpRequestHeaders; // may change dynamically, must keep reference
        this._instanceManager = instanceManager;
        this._cornerstoneImageAdapter = cornerstoneImageAdapter;
        this._workerPool = workerPool;
        this._cache = cache;

        // Declare observables
        this.onBinaryLoaded = new osimis.Listener();
        this.onBinaryUnLoaded = new osimis.Listener(); // @todo rename to Failed or aborted

        /** _loadedCachedRequests: boolean[imageId][quality]
         * Used to differentiate unfineshed cached request from fineshed cached requests.
         */
        this._loadedCacheIndex = {};

        // Flush cache every 5 seconds
        // @todo move inside cache module
        window.setInterval(function() {
            // @todo check once binary has been loaded + add debounce
            cache.flush();
        }, 5000);
    }
    
    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageBinaryManager
     *
     * @name osimis.ImageBinaryManager#onBinaryLoaded
     * 
     * @param {callback} callback
     *    Called when a binary has been loaded
     * 
     *    Parameters:
     *    * {string} `id`
     *    * {int} `quality`
     *    * {object} `cornerstoneImageObject`
     */
    ImageBinaryManager.prototype.onBinaryLoaded = function() { /* noop */ };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageBinaryManager
     *
     * @name osimis.ImageBinaryManager#onBinaryUnLoaded
     * @param {callback} [cb]
     *    Called when a binary loading has failed/aborted
     * 
     *    Parameters:
     *    * {string} `id`
     *    * {int} `quality`
     */
    ImageBinaryManager.prototype.onBinaryUnLoaded = function() { /* noop */ };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageBinaryManager
     *
     * @name osimis.ImageBinaryManager#requestLoading
     * @param {string} id Id of the image (<instanceId>:<frameIndex>)
     * @param {osimis.quality} quality Quality of the binary
     * @param {priority} priority
     *    Priority of the download (lower is better)
     *    * `0` for displayed images
     *    * `1`, `2`, ... for preloading images
     * @return {Promise<object>}
     *    Returns a promise of cornerstone image object,
     *    see https://github.com/chafey/cornerstone/wiki/image
     *
     * @description
     * Request the loading of an image with a specified priority.
     * Used notably by the preloader instead of the standard .get method.
     *
     * Increase the request reference count.
     */
    ImageBinaryManager.prototype.requestLoading = function(id, quality, priority) {
        var Promise = this._Promise;
        var httpRequestHeaders = this._httpRequestHeaders;
        var instanceManager = this._instanceManager;
        var cornerstoneImageAdapter = this._cornerstoneImageAdapter;
        var pool = this._workerPool;
        var cache = this._cache;
        var loadedCacheIndex = this._loadedCacheIndex;
        var _this = this;

        // Generate cache index
        // used to differentiate cached requests from finished cached requests
        loadedCacheIndex[id] = loadedCacheIndex[id] || {};

        // Generate request cache (if inexistant)
        var request = cache.get(id, quality);
        if (!request) {
            // Set http headers
            // @note Since the request is queued, headers configuration might
            //     changes in the meanwhile (before the request execution).
            //     However, since they are linked by reference (and not
            //     copied), changes will be bound.
            var headers = httpRequestHeaders; // used to set user auth tokens for instance

            // Retrieve dicom tags of the instance, as they may be required to uncompress the
            // image in the right format (ie. tags such as BitsStored, BitsAllocated,
            // PixelRepresentation, ...).
            var instanceId = id.split(':')[0];
            var requestPromise = instanceManager
                .getInfos(instanceId)
            // Download klv, extract metadata & decompress data to raw image
                .then(function(infos) {
                    return pool
                        .queueTask({
                            type: 'getBinary',
                            id: id,
                            quality: quality,
                            headers: headers,
                            infos: infos
                        });
                })
            // Reconstruct cornerstone object from buffer (we can't transfer pixel view through web worker -
            // only buffer), manage cache & trigger events.
                .then(function(result) {
                    // Loading done

                    // Abort the finished loading when an abortion has been
                    // asked but not made in time
                    if (!cache.getRefCount(id, quality)) {
                        // Remove promise from cache
                        // @note Things will be cleaned by `.then(null,
                        //     function(err))`
                        return Promise.reject(new Error('aborted'));
                    }

                    // configure cornerstone related object methods
                    var cornerstoneImageObject = cornerstoneImageAdapter.process(id, quality, result.cornerstoneMetaData, result.pixelBuffer, result.pixelBufferFormat);

                    // consider the promise to be resolved
                    loadedCacheIndex[id][quality] = true;
                    var request = cache.get(id, quality);
                    request.isLoaded = true;

                    // Set the cache size so total memory size can be limited
                    cache.setBinarySize(id, quality, result.pixelBuffer.byteLength);
                    // request.size = result.pixelBuffer.byteLength

                    // trigger binaryLoaded event
                    _this.onBinaryLoaded.trigger(id, quality, cornerstoneImageObject);

                    return cornerstoneImageObject;
                })
                .then(null, function(err) {
                    // Loading aborted

                    // This is called even when the error comes from the
                    // adapter (promise <.then(null, function(err) {...})>
                    // syntax) to be sure the promise is uncached anytime the
                    // promise is rejected

                    // Remove promise from cache in case of request failure. We
                    // need to check if it's in the cache though, since it's
                    // possible the item has already be removed in the
                    // abortLoading method. We keep things that way to avoid
                    // synchronization issues (see the abortLoading method
                    // source).
                    if (cache.get(id, quality)) {
                        cache.remove(id, quality);
                    }
                    if (loadedCacheIndex[id] && typeof loadedCacheIndex[id][quality] !== 'undefined') {
                        delete loadedCacheIndex[id][quality];
                    }
                    
                    // Trigger binary has been unloaded (used by torrent-like
                    // loading bar).
                    _this.onBinaryUnLoaded.trigger(id, quality);

                    // Propagate promise error
                    return Promise.reject(err);
                });
            
            request = new osimis.ImageBinaryRequest(id, quality, requestPromise);
            cache.add(id, quality, request);
        }

        // Increment cache reference count
        cache.push(id, quality);
        request.pushPriority(priority);

        // Return Promise<cornerstoneImageObject>
        return request.promise;
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageBinaryManager
     *
     * @name osimis.ImageBinaryManager#abortLoading
     * @param {string} id Id of the image (<instanceId>:<frameIndex>)
     * @param {osimis.quality} quality Quality of the binary
     * @param {priority} priority
     *    Priority of the download (lower is better)
     *    * `0` for displayed images
     *    * `1`, `2`, ... for preloading images
     *
     * @description
     * Decrease binary request reference counting.
     * 
     * When reference counting arrives at 0,
     * - if the request is being downloaded, it is aborted
     * - if the request has already been downloaded, it can be flushed from
     *   cache (only when cache max size is exceeded)
     *
     * # @warning This should be called even if the request has failed, because
     * the reference count isn't decreased when a request failed.
     * # @todo Rename the method to something like decrBinaryRefCount instead.
     */
    ImageBinaryManager.prototype.abortLoading = function(id, quality, priority) {
        var pool = this._workerPool;
        var cache = this._cache;
        var loadedCacheIndex = this._loadedCacheIndex;
        
        var logError;
        if (console.warn) {
            logError = console.warn.bind(console);
        }
        else {
            logError = console.error.bind(console);
        }
        
        try {
            // Check the item is cached
            if (cache.getRefCount(id, quality) < 1) {
                // Make sure the cache is cleaned first so 
                // a new download can occur if any bug happens
                try {
                    cache.remove(id, quality);
                }
                catch(e) {

                }

                // Assert
                throw new Error('Free uncached image binary.');
            }

            // Decount reference
            try { // bypass errors till it's refactored & unit tested, this will have no consequence
                var request = cache.get(id, quality);
                request.popPriority(priority);
            }
            catch(e) {
                logError(e);
            }
            cache.pop(id, quality);

            // Cancel request if pending
            if (cache.getRefCount(id, quality) === 0 && !loadedCacheIndex[id][quality]) {
                // Cancel request if pending
                pool
                    .abortTask({
                        type: 'getBinary',
                        id: id,
                        quality: quality
                    });

                // Request will be cleaned in the promise rejection, however, we need to remove
                // it right away to avoid sync issues (we don't want to way the 'ping-pong' delay induced
                // by the abortion with subsequent calls to the webworker.)
                // @warning may cause sync issue with taskPool
                cache.remove(id, quality);
                if (loadedCacheIndex[id] && typeof loadedCacheIndex[id][quality] !== 'undefined') {
                    delete loadedCacheIndex[id][quality];
                }
            }
        }
        catch (e) {
            logError('Failed removal of task');

            throw e;
        }
    };

    /**
     * wvImageBinaryManager#get(id, quality)
     *
     * @param id 
     * @param quality see osimis.quality
     * @return Promise<object> cornerstoneImageObject, see https://github.com/chafey/cornerstone/wiki/image
     *
     * @deprecated in favour of requestLoading
     */
    ImageBinaryManager.prototype.get = function(id, quality) {
        return this.requestLoading(id, quality, 0);
    };

    /**
     * wvImageBinaryManager#free(id, quality)
     *
     * Free the defined image binary.
     * Reference counting implementation (if the image was called 4 times, #free has to be called 4 time as well to effectively free the memory).
     *
     * @pre The promise returned by wvImageBinary#get has been resolved (do not call free when the promise has been rejected !).
     * @pre The user has deleted his own pointers to the binary in order to allow the GC to clean the memory.
     *
     * @param id <instanceId>:<frameIndex>
     * @param quality see osimis.quality
     *
     * @deprecated in favour of abortLoading
     */
    ImageBinaryManager.prototype.free = function(id, quality) {
        return this.abortLoading(id, quality, 0);
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageBinaryManager
     *
     * @name osimis.ImageBinaryManager#listCachedBinaries
     * @param {string} id Id of the image (<instanceId>:<frameIndex>)
     * @return {Array<osimis.quality>} List of qualities in cache *and* already loaded
     *
     * @description
     *
     * Return the qualities of the loaded binaries of an image.
     */
    ImageBinaryManager.prototype.listCachedBinaries = function(id) {
        var loadedCacheIndex = this._loadedCacheIndex;
        var result = [];

        if (!loadedCacheIndex[id]) {
            result = [];
        }
        else {
            result = _
                .keys(loadedCacheIndex[id])
                .map(function(k) {
                    return +k; // Make sure keys stay integers
                });
        }

        return result;
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageBinaryManager
     *
     * @name osimis.ImageBinaryManager#getCachedHighestQuality
     *
     * @param {string} id
     * Id of the image (<instanceId>:<frameIndex>)
     *
     * @return {osimis.quality}
     * Highest qualities in cache *and* already loaded
     *
     * @description
     * Return the highest quality of the loaded binaries of an image.
     */
    ImageBinaryManager.prototype.getBestQualityInCache = function(id) {
        var loadedCacheIndex = this._loadedCacheIndex;
        if (!loadedCacheIndex[id]) {
            return null;
        }

        var highestQuality = _.max(_.keys(loadedCacheIndex[id]));

        return highestQuality;
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageBinaryManager
     * 
     * @name osimis.ImageBinaryManager#getBestBinaryInCache
     *
     * @param {string} id
     * Id of the image (<instanceId>:<frameIndex>)
     *
     * @return {Promise<object>}
     * A promise containing a Cornerstone ImageObject of the image's
     * best-quality binary or an empty promise if no binary has been
     * loaded yet.
     * See `https://github.com/chafey/cornerstone/wiki/image` for the
     * interface.
     */
    ImageBinaryManager.prototype.getBestBinaryInCache = function(id) {
        var Promise = this._Promise;
        var loadedCacheIndex = this._loadedCacheIndex;
        var cache = this._cache;

        if (!loadedCacheIndex[id]) {
            return Promise.when(undefined);
        }

        var highestQuality = +_.max(_.keys(loadedCacheIndex[id]));
        return cache.get(id, highestQuality).promise;
    }

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvImageBinaryManager
     *
     * @name osimis.ImageBinaryManager#resetCache
     *
     * @description
     * Clean up the cache. Can also be called via the global
     * `osimis.resetChache()` function call. This is only mean to be used for
     * testing.
     */
    ImageBinaryManager.prototype.resetCache = function() {
        this._cache.reset();
        this._loadedCacheIndex = {};
    };

    osimis.ImageBinaryManager = ImageBinaryManager;

    // Inject module in angular
    angular
        .module('webviewer')
        .factory('wvImageBinaryManager', wvImageBinaryManager);

    /* @ngInject */
    function wvImageBinaryManager($q, wvConfig, wvInstanceManager, wvCornerstoneImageAdapter) {
        // Init binary cache
        var cache = new osimis.ImageBinariesCache();

        // Init worker pool
        var workerPool = new window.osimis.WorkerPool({
            path: /* @inline-worker: */ '/app/image/image-parser.worker/main.js',
            workerCount: 7, // with 5 workers, there are 4 concurrent downloads, with 10 workers: 6
            createPromiseFn: $q,
            taskPriorityPolicy: new osimis.TaskPriorityPolicy(cache) // @todo break dependency w/ cache
        });
        // @todo Free inline-worker's ObjectUrl

        // Send the orthanc API URL to each threads
        workerPool.broadcastMessage({
            type: 'setOrthancUrl',
            orthancApiUrl: wvConfig.orthancApiURL
        });

        // Init binary manager
        var binaryManager = new osimis.ImageBinaryManager($q, wvConfig.httpRequestHeaders, wvInstanceManager, wvCornerstoneImageAdapter, cache, workerPool);

        // For dev, provide an easy way to reset the cache
        osimis.resetCache = function() {
            binaryManager.resetCache();
        };

        return binaryManager;
    }

})(this.osimis || (this.osimis = {}));