/**
 * A mock of ImageBinaryManager.
 * Returns empty requests instead of http ones.
 *
 * Provide timeoutByQuality option to set the request order.
 */
(function(osimis, mock) {
    'use strict';

    // Inherits from mock.ImageBinaryManager from osimis.ImageBinaryManager
    function ImageBinaryManager(opts) {
        opts = opts || {};
        opts.Promise = opts.Promise || window.Promise;
        opts.timeoutByQuality = opts.timeoutByQuality || false;
        opts.cache = opts.cache || new osimis.ImageBinariesCache(); 
        opts.workerPool = opts.workerPool || null;
        opts.imageBinaries = opts.imageBinaries || {};
        opts.instanceManager = opts.instanceManager || {
            getInfos: function() { /* noop */ }
        };

        var httpRequestHeaders = null;
        var cornerstoneImageAdapter = null;
    
        this._Promise = opts.Promise;
        this._timeoutByQuality = opts.timeoutByQuality;
        this._imageBinaries = opts.imageBinaries;

    	osimis.ImageBinaryManager.call(this, opts.Promise, httpRequestHeaders, opts.instanceManager, cornerstoneImageAdapter, opts.cache, opts.workerPool);
    };
    ImageBinaryManager.prototype = Object.create(osimis.ImageBinaryManager.prototype);

    // Mock methods
    ImageBinaryManager.prototype.requestLoading = function(id, quality, priority) {
        var Promise = this._Promise;
        var cache = this._cache;
        var loadedCacheIndex = this._loadedCacheIndex;
        var timeoutByQuality = this._timeoutByQuality;
        var imageBinaries = this._imageBinaries;
        var _this = this;
        
    	var request = cache.get(id, quality);
        if (!request) {
            // Mock response found in imageBinaries[id][quality] or empty ones
            var promise = Promise.resolve(imageBinaries[id] && imageBinaries[id][_.invert(osimis.quality)[quality]]);

            // Abort the finished loading when an abortion has been asked but not made in time
            promise = promise.then(function(cornerstoneImageObject) {
                if (!cache.getRefCount(id, quality)) {
                    // Remove promise from cache
                    cache.remove(id, quality);
                    if (loadedCacheIndex[id] && typeof loadedCacheIndex[id][quality] !== 'undefined') {
                        delete loadedCacheIndex[id][quality];
                    }
                    return Promise.reject('aborted');
                }
                else {
                    return cornerstoneImageObject;
                }
            });
 
            
            // Update loaded cache index
            promise = promise.then(function(cornerstoneImageObject) {
                loadedCacheIndex[id] = loadedCacheIndex[id] || {};
                loadedCacheIndex[id][quality] = true;
                return cornerstoneImageObject;
            });

            // Enforce loading order by quality
            var qualityName = _.invert(osimis.quality)[quality];
            if (timeoutByQuality && timeoutByQuality.hasOwnProperty(qualityName)) {
                promise = promise.then(function(cornerstoneImageObject) {
                    return new Promise(function(resolve) {
                        setTimeout(resolve, timeoutByQuality[qualityName]);
                        
                        return cornerstoneImageObject;
                    });
                });
            }

            request = new osimis.ImageBinaryRequest(id, quality, promise);
            cache.add(id, quality, request);
        }

        // Increment cache reference count
        cache.push(id, quality);
        request.pushPriority(priority);

        return request.promise;
    };
    ImageBinaryManager.prototype.abortLoading = function(id, quality, priority) {
        var cache = this._cache;

        // Check the item is cached
        if (cache.getRefCount(id, quality) < 1) {
            throw new Error('Free uncached image binary.');
        }

        // Decount reference
        cache.pop(id, quality)
        var request = cache.get(id, quality);
        request.popPriority(priority);
    };

    mock.ImageBinaryManager = ImageBinaryManager;

})(this.osimis || (this.osimis = {}), this.mock || (this.mock = {}));