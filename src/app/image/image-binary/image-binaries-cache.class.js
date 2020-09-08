/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.ImageBinariesCache
 *
 * @description
 * The `ImageBinariesCache` class cache image binary *requests* and their results.
 *
 * The cache can be flushed at regular interval to avoid 
 * overloading computer's memory.
 * 
 * # @rationale
 * A manual reference counting mechanism is provided to make sure flushed images
 * are the one that requires to be flushed. Therefore the flushing is not based
 * on the request age, but on the request needs.
 * For now, only requests that shouldn't be preloaded or displayed are flushed to avoid
 * preloading binaries and uncaching them just after.
 * # @warning this bypass the cache size limit..
 *
 * Track the request's loading status so the one which are still being loaded when being
 * flushed can also be aborted by the user.
 *
 * @requires osimis.Listener
 * @requires osimis.quality (to flush requests differently based on image quality)
 */
(function(module) {
    'use strict';
    
    /**
     * @constructor osimis.ImageBinariesCache
     */
    function ImageBinariesCache() {
        // _cache[imageId][quality] = Promise<cornerstoneImageObject>
        this._cache = {};

        // Index of the requests which are fully loaded.
        // Used to abort the one that are still in loading
        // instead of fully download them.
        // 
        // _loadedBinariesIndex[imageId][quality] = boolean
        // 
        // @todo move outside
        // this._loadedBinariesIndex = {};

        // Size of the request result's binary,
        // only set once the request has been loaded.
        // Must be set by the user.
        // Used to keep record of the overall cache size.
        // 
        // _binarySizes[imageId][quality] = int
        this._binarySizes = {};

        // Number of situation the binary is desired for
        // Used to select which request to flush (flush only the
        // ones that have no reference left).
        // 
        // @warning The current design rule is: reference count is never reset,
        // even when request fails. That way, cache users like preloader don't
        // have to keep state of the request success/failures to know if they
        // should trigger a request abortion or not.
        // @todo Separate abort/get from incr/decr in the ImageBinaryManager!
        // 
        // 
        // _referenceCount[imageId][quality] = int
        this._referenceCount = {};

        this._scopes = {
            'LOW': module.quality.LOW,
            'MEDIUM': module.quality.MEDIUM,
            'HIGH': 14312 // either quality.LOSSLESS or quality.PIXELDATA - use
                          // positive integer as its faster on current browsers
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#add
     * @param {string} imageId         Id of the downloaded image.
     * @param {osimis.quality} quality Quality of the image.
     * @param {Promise} binaryRequest  Promise of the cornerstone image object.
     * 
     * @description
     * Register a request.
     * 
     * This does not push the request's reference count. User should
     * do so and call the push method.
     *
     * # @throw {Error} Throws when a request is being cached twice
     */
    ImageBinariesCache.prototype.add = function(imageId, quality, binaryRequest) {
        // Consider lossless & pixeldata the same
        var scope = this._getCacheScopeFromQuality(quality);

        // Create hashmap objects when not yet available
        // this._loadedBinariesIndex[imageId] = this._loadedBinariesIndex[imageId] || {};
        this._binarySizes[imageId] = this._binarySizes[imageId] || {};
        this._referenceCount[imageId] = this._referenceCount[imageId] || {};
        this._cache[imageId] = this._cache[imageId] || {};

        // Prevent dual caching of the same request
        if (this._cache[imageId][scope]) {
            throw new Error('Dual caching of the same request');
        }

        // Flag the request as `still in loading`
        // this._loadedBinariesIndex[imageId][quality] = false;

        // Set the request binary size to undefined (yet, awaiting end of request)
        this._binarySizes[imageId][scope] = undefined;

        // Set the binary ref count to 0 (user needs to call the #push method)
        // If _referenceCount already defined, keep the current one (this can happen if a request
        // as failed: it is removed from cache but there still are references to it).
        this._referenceCount[imageId][scope] = this._referenceCount[imageId][scope] || 0;

        // Cache the request
        this._cache[imageId][scope] = binaryRequest;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#remove
     * @param {string} imageId        Id of the downloaded image
     * @param {quality} quality       Quality of the image
     *
     * @description
     * Remove a request from cache
     *
     * This is used to remove requests that fails from cache.
     */
    ImageBinariesCache.prototype.remove = function(imageId, quality) {
        // Consider lossless & pixeldata the same
        var scope = this._getCacheScopeFromQuality(quality);

        // Prevent removing of uncached image
        var removingUncachedImage = false;
        if (!this._cache[imageId][scope]) {
            removingUncachedImage = true;
        }

        // Uncache the request
        this._cache[imageId][scope] = undefined;
        // Do not reset _referenceCount
        // this._referenceCount[imageId][scope] = 0;
        this._binarySizes[imageId][scope] = undefined;

        // Throw the exception only after the cache is in clean state
        if (removingUncachedImage) {
            throw new Error('Removing an uncached instance from cache');
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#get
     * @param {string} imageId  Id of the downloaded image
     * @param {quality} quality Quality of the image
     * @return {promise}        The retrived request promise or `null` if not found
     *
     * @description
     * Retrieve a request (or null if not in cache).
     */
    ImageBinariesCache.prototype.get = function(imageId, quality) {
        // Consider lossless & pixeldata the same
        var scope = this._getCacheScopeFromQuality(quality);

        return this._cache[imageId] && this._cache[imageId][scope] || null;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#push
     * @param {string} imageId  Id of the downloaded image
     * @param {quality} quality Quality of the image
     * 
     * @description
     * Increase a request reference count.
     */
    ImageBinariesCache.prototype.push = function(imageId, quality) {
        // Consider lossless & pixeldata the same
        var scope = this._getCacheScopeFromQuality(quality);

        ++this._referenceCount[imageId][scope];
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#pop
     * @param {string} imageId  Id of the downloaded image
     * @param {quality} quality Quality of the image
     * 
     * @description
     * Decrease a request reference count.
     * 
     * When at 0, the request can be flushed out of cache (by
     * the flush method, we may want to keep the request in cache
     * a little longer even if it's completely unused..).
     *
     * # @warning Binary should be popped from cache even when the request as
     *            aborted. 
     */
    ImageBinariesCache.prototype.pop = function(imageId, quality) {
        // Consider lossless & pixeldata the same
        var scope = this._getCacheScopeFromQuality(quality);

        --this._referenceCount[imageId][scope];

        if (this._referenceCount[imageId][scope] < 0) {
            throw new Error('Reference count should not go below 0');
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#getRefCount
     * @param {string} imageId  Id of the downloaded image
     * @param {quality} quality Quality of the image
     *
     * @description
     * Return the ref count of the binary.
     */
    ImageBinariesCache.prototype.getRefCount = function(imageId, quality) {
        // Consider lossless & pixeldata the same
        var scope = this._getCacheScopeFromQuality(quality);

        return this._referenceCount[imageId] && this._referenceCount[imageId][scope] || 0;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#setBinarySize
     * @param {string} imageId       Id of the downloaded image
     * @param {quality} quality      Quality of the image
     * @param {int} binarySizeInByte The size of the downloaded binary
     * 
     * @description
     * Since this class caches request, we need the user to provide the request result's size
     * so the `ImageBinariesCache` may keep track of its total memory footprint. This allows the
     * cache flushing system to know when a flush has to occur.
     */
    ImageBinariesCache.prototype.setBinarySize = function(imageId, quality, binarySizeInByte) {
        // Consider lossless & pixeldata the same
        var scope = this._getCacheScopeFromQuality(quality);

        // this._loadedBinariesIndex[imageId][quality] = true;
        this._binarySizes[imageId][scope] = binarySizeInByte;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#toArray
     * @deprecated
     * @return {object} Two dimentional hashmap of promise of cornerstone image object.
     *                  Hash keys are [<imageId>][<quality>].
     * 
     * @description
     * Return the cache as an hashmap (for retro compatibility with older code).
     * # @invariant return[imageId][quality] = Promise<cornerstoneImageObject>
     * # @deprecated
     */
    ImageBinariesCache.prototype.toArray = function() {
        return this._cache;
    };

    ImageBinariesCache.prototype._getCacheScopeFromQuality = function(quality) {
        switch (quality) {
            // By default, scope cache to the image quality
            case module.quality.LOW:
                return this._scopes.LOW;
            case module.quality.MEDIUM:
                return this._scopes.MEDIUM;
            // use a common scope for both LOSSLESS & PIXELDATA
            case this._scopes.HIGH:
                return this._scopes.HIGH;
            case module.quality.LOSSLESS:
                return this._scopes.HIGH;
            case module.quality.PIXELDATA:
                return this._scopes.HIGH;
            default:
                throw new Error('Unexpected quality');
        }
    };

    ImageBinariesCache.prototype._getCacheScopeSize = function(scope) {
        var cache = this._cache;
        var binarySizes = this._binarySizes;
    
        var totalScopeCache = 0;

        // Calculate scope cache amount by looping through each requests
        // @todo make more efficient (no need to recalculate at each flush, just keep a global one)
        for (var imageId in cache) {
            var cachedRequest = cache[imageId][scope];

            // Increment totalCache amount
            if (cache[imageId].hasOwnProperty(scope)) {
                totalScopeCache += binarySizes[imageId][scope] || 0; // `|| 0` because binarySizes can be undefined (because binary as not yet been loaded and
                                                                     // the response size is not available).
            }
        }

        return totalScopeCache;
    };

    // ImageBinariesCache.prototype._getCacheTotalSize = function() {
    //     var _this = this;
        
    //     return _
    //         .keys(this._scopes)
    //         // Retrieve all scopes
    //         .map(function(scopeName) {
    //             return _this._getCacheScopeSize(scopeName);
    //         })
    //         // Sum all scopes
    //         .reduce(function(actualTotalSize, nextScopeSize) {
    //             return actualTotalSize + nextScopeSize;
    //         }, 0);
    // };

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#flush
     * 
     * @description
     * Flushes the cache.
     */
    ImageBinariesCache.prototype.flush = function() {
        var cache = this._cache;
        var referenceCount = this._referenceCount;
        var binarySizes = this._binarySizes;
        var _this = this;

        // @todo check once binary has been loaded + add debounce
        
        // Keep data for log
        var totalFlushedCacheSizeByScope = {};
        var totalCacheSizeByScope = {};
        
        // Flush files
        _flushCache(this._scopes.HIGH, 1024 * 1024 * 700); // Max 700mo
        _flushCache(this._scopes.MEDIUM, 1024 * 1024 * 700); // Max 700mo
        _flushCache(this._scopes.LOW, 1024 * 1024 * 300); // Max 300mo

        function _flushCache(scope, cacheSizeLimit) {
            // Init variables
            totalFlushedCacheSizeByScope[scope] = totalFlushedCacheSizeByScope[scope] || 0;
            totalCacheSizeByScope[scope] = _this._getCacheScopeSize(scope);
    
            // Do not flush if scope size maximum is not depassed
            if (totalCacheSizeByScope[scope] < cacheSizeLimit) { 
                return;
            }

            // Flush images one by one
            for (var imageId in referenceCount) {
                // Stop flush too much as soon as there is enough space left
                if (totalCacheSizeByScope[scope] < cacheSizeLimit) {
                    return;
                }

                // Flush request only if not locked
                var refCount = referenceCount[imageId][scope];
                if (refCount > 0) {
                    continue;
                }

                // Decrement cache size
                var flushedSize = binarySizes[imageId][scope]; // store flushedSize before it's removed by the #remove method call
                totalCacheSizeByScope[scope] -= flushedSize;
                
                // Flush request
                _this.remove(imageId, scope);

                // Save flushed quantity for logging purpose
                totalFlushedCacheSizeByScope[scope] += flushedSize;
            }

            // console.log('flush cache q:', quality, 'pre:', totalCacheSizeByQuality[quality] / 1024 / 1024, 'post:', totalFlushedCacheSizeByScope[quality] / 1024 / 1024);
        }
    }

    /**
     * @ngdoc method
     * @methodOf osimis.ImageBinariesCache
     *
     * @name osimis.ImageBinariesCache#reset
     * 
     * @description
     * Reset the cache. Meant mainly for testing.
     */
    ImageBinariesCache.prototype.reset = function() {
        this._cache = {};
        this._binarySizes = {};
        // this._referenceCount = {};
    }

    module.ImageBinariesCache = ImageBinariesCache;

})(this.osimis || (this.osimis = {}));
