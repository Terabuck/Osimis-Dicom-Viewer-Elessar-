(function(module) {
    'use strict';

    /** ImageBinaryRequest
     * 
     * WorkerPool use it to determine which request should be prioritized.
     *
     * CacheFlushPolicy use it to determine the amount of global ram used and
     * which binary remove from cache first. 
     *
     */
    function ImageBinaryRequest(imageId, quality, promise) {
        this.imageId = imageId;
        this.quality = quality;
        this.promise = promise;

        /** isLoaded
         *
         * Used to differentiate fineshed cached requests from unfineshed cached request
         * Only the latter can be aborted
         *
         */
        this.isLoaded = false;

        /** size: undefined | Uint32 (in bytes)
         *
         * Used by cache engine to determine the total amount of cache.
         * The cache can be then flushed when it becomes too big.
         * 
         * size === undefined when the binary has not been loaded yet
         *
         */
        this.size = undefined;

        /** requestHistory: Array<RequestPriority>
         *
         * requestHistory.length === referenceCount
         *
         * RequestHistory[<any>].priority =
         *   From highest to lowest
         *   0 - currently displaying
         *   1 - preloaded from selected study
         *   2 - preloaded from selected series
         *
         * RequestHistory[<any>].timestamp = Date.now()
         *   timestamp is used by WorkerPool to determine which binary load first when no other parameters are left.
         *   timestamp is used by CacheFlushPolicy to determine which binary should be freed first.
         *
         */
        this.requestHistory = [];

        /** lastTimeDisplayed: undefined | timestamp
         *
         * Used by CacheFlushPolicy to determines which cache to flush first
         * 
         * _lastTimeDisplayed === undefined if the image is still displaying
         *
         */
        this._lastTimeDisplayed = undefined;
    }

    /** ImageBinaryRequest#getLastTimeDisplayed()
     *
     * Used by CacheFlushPolicy to determines which cache to flush first
     *
     */
    ImageBinaryRequest.prototype.getLastTimeDisplayed = function() {
        return this._lastTimeDisplayed || Date.now();
    }

    /** ImageBinaryRequest#getReferenceCount()
     *
     * Used to know if cache can be flushed.
     *
     */
    ImageBinaryRequest.prototype.getReferenceCount = function() {
        return this.requestHistory.length;
    };

    /** ImageBinaryRequest#pushPriority(priority: 'prefetching' | 'display')
     *
     * Increment the reference count of the cached binary.
     *
     */
    ImageBinaryRequest.prototype.pushPriority = function(priority) {
        // Instantiate RequestPriority
        var RequestPriority = {
            priority: priority,
            timestamp: Date.now()
        };

        // Add RequestPriority to the queue
        this.requestHistory.push(RequestPriority);

        // unset _lastTimeDisplayed if the binary is being displayed at the moment
        if (priority === 'display') {
            this._lastTimeDisplayed = undefined;
        }
    };

    /** ImageBinaryRequest#getPriority()
     *
     * @return the highest priority in history (0 is the highest possible)
     *
     */
    ImageBinaryRequest.prototype.getPriority = function() {
        var highestPriority = null;

        // Find the highest priority in the history
        for (var i=0; i<this.requestHistory.length; ++i) {
            var historyPriority = this.requestHistory[i].priority;
            if (highestPriority === null || historyPriority < highestPriority) {
                highestPriority = historyPriority;
            }
        }

        return highestPriority;
    };
    
    /**
     *
     *
     */
    ImageBinaryRequest.prototype.hasPriorityInHistory = function(priority) {
        // Find the latest reference provided by the specified priority
        for (var i=0; i<this.requestHistory.length; ++i) {
            var requestPriority = this.requestHistory[i];
            if (requestPriority.priority === priority) {
                // Return true - it has been found
                return true;
            }
        }

        // Return true - it has not been found
        return false;
    };

    /** ImageBinaryRequest#popPriority(priority: 'prefetching' | 'display')
     *
     * Decrement the reference count of the cached binary.
     * Used to know if a binary is no longer waiting for display or no longer required to be preloaded.
     *
     */
    ImageBinaryRequest.prototype.popPriority = function(priority) {
        var latestPriorityIndex = null;

        // Find the latest reference provided by the specified priority
        for (var i=this.requestHistory.length-1; i>=0; --i) {
            var requestPriority = this.requestHistory[i];
            if (requestPriority.priority == priority) {
                // Save the first priority found (in reverse loop order)
                latestPriorityIndex = i;
                break;
            }
        }

        // Remove the latest reference provided by the specified priority
        if (latestPriorityIndex === null) {
            // No Priority with priority has been found - throw error
            throw new Error('ImageBinaryRequest pop priority not found');
        }
        else {
            // Remove the request Priority from the queue
            this.requestHistory.splice(latestPriorityIndex, 1);

            // If the priority his no longer displayed, set the last time it's been to now
            if (priority == 0 && !this.hasPriorityInHistory(0)) {
                this._lastTimeDisplayed = Date.now();
            }
        }
    };
    
    /** isWaitingForDisplay: boolean
     *
     * - true if the user is currently waiting for the image to be drawed..
     *
     * True provide the highest loading priority
     *
     */
    ImageBinaryRequest.prototype.isWaitingForDisplay = function() {
        // Return true if a request Priority of display priority has been found
        for (var i=this.requestHistory.length-1; i>=0; --i) {
            var requestPriority = this.requestHistory[i];
            if (requestPriority.priority === 0) {
                return true;
            }
        }

        // Return false otherwise
        return false;
    };

    module.ImageBinaryRequest = ImageBinaryRequest;

})(window.osimis || (window.osimis = {}));
