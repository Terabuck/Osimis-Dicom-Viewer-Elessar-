/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.TaskPriorityPolicy
 */
(function(module) {
    'use strict';

    function TaskPriorityPolicy(imageBinariesCache) {
        // imageBinariesCache[id][quality] = <ImageBinaryRequest> - used to calculate priorities
        this._imageBinariesCache = imageBinariesCache;
    }

    /**
     * @ngdoc method
     * @methodOf osimis.TaskPriorityPolicy
     * 
     * @name osimis.TaskPriorityPolicy#selectTask
     * @param {Array<osimis.TaskWorker>} availableWorkers The available workers
     * @param {Array<osimis.TaskWorker>} busyWorkers The workers currently 
     *                                               working
     * @param {Array<osimis.Task>} tasksToProcess The tasks in the process list
     * @param {Array<osimis.Task>} tasksInProcess The tasks being treated by
     *                                            a web worker
     * @return {osimis.Task|null} The chosen task to process
     *
     * @description
     * This methods returns the next task to be processed.
     *
     * # @todo Optimize heavily! It's called at each binary loading! Maybe use
     *         an external priority queue implementation?
     */
    TaskPriorityPolicy.prototype.selectTask = function(availableWorkers, busyWorkers, tasksToProcess, tasksInProcess) {
        var imageBinariesCache = this._imageBinariesCache;
        var taskQueue = tasksToProcess;

        // Sort by priority
        var loadingHighPriorityQueue = [];
        var preloadingHighPriorityQueue = [];
        var preloadingLowPriorityQueue = [];
    
        for (var i=0; i<taskQueue.length; ++i) {
            var task = taskQueue[i];
            var id = task.options.id;
            var quality = task.options.quality;
            var request = imageBinariesCache.get(id,quality);
            if (!request) {
                // It's possible for a task to be removed from cache while still being in process (in abortion),
                // @todo separete abortion logic from the rest.
                console.error('Cache & Task Queue should strictly contains the same requests!');
                //throw new Error('Cache & Task Queue should strictly contains the same requests!');
                continue;
            }
            var priority = request.getPriority();

            switch(priority) {
            case 0:
                loadingHighPriorityQueue.push({
                    request: request,
                    task: task
                });
                break;
            case 1:
                preloadingHighPriorityQueue.push({
                    request: request,
                    task: task
                });
                break;
            case 2:
                preloadingLowPriorityQueue.push({
                    request: request,
                    task: task
                });
                break;
            }
        }

        // see osimis.quality
        // - 1 lowest
        // - 2 medium
        // - 100 lossless
        // - 101 pixeldata

        /** loading high priority **/

        // Process loading high priority first - lowest quality
        for (i=0; i<loadingHighPriorityQueue.length; ++i) {
            var task = loadingHighPriorityQueue[0].task;
            var request = loadingHighPriorityQueue[0].request;
            
            if (request.quality === 1) return task;
        }

        // Process loading high priority first - medium quality
        for (i=0; i<loadingHighPriorityQueue.length; ++i) {
            var task = loadingHighPriorityQueue[0].task;
            var request = loadingHighPriorityQueue[0].request;
            
            if (request.quality === 2) return task;
        }
        
        // Process loading high priority first - pixeldata quality
        for (i=0; i<loadingHighPriorityQueue.length; ++i) {
            var task = loadingHighPriorityQueue[0].task;
            var request = loadingHighPriorityQueue[0].request;
            
            if (request.quality === 101) return task;
        }

        // Process loading high priority first - lossless quality
        for (i=0; i<loadingHighPriorityQueue.length; ++i) {
            var task = loadingHighPriorityQueue[0].task;
            var request = loadingHighPriorityQueue[0].request;
            
            if (request.quality === 100) return task;
        }

        // Make sure to always left over one thread for loading high priority
        if (availableWorkers.length < 2) return;

        /** preloading high priority **/

        // Process preloading high priority in second - lowest quality
        for (i=0; i<preloadingHighPriorityQueue.length; ++i) {
            var task = preloadingHighPriorityQueue[0].task;
            var request = preloadingHighPriorityQueue[0].request;
            
            if (request.quality === 1) return task;
        }

        // Process preloading high priority in second - medium quality
        for (i=0; i<preloadingHighPriorityQueue.length; ++i) {
            var task = preloadingHighPriorityQueue[0].task;
            var request = preloadingHighPriorityQueue[0].request;
            
            if (request.quality === 2) return task;
        }

        // Process loading high priority first - pixeldata quality
        for (i=0; i<preloadingHighPriorityQueue.length; ++i) {
            var task = preloadingHighPriorityQueue[0].task;
            var request = preloadingHighPriorityQueue[0].request;
            
            if (request.quality === 101) return task;
        }

        // Process preloading high priority in second - lossless quality
        for (i=0; i<preloadingHighPriorityQueue.length; ++i) {
            var task = preloadingHighPriorityQueue[0].task;
            var request = preloadingHighPriorityQueue[0].request;
            
            if (request.quality === 100) return task;
        }

        /** preloading low priority **/

        // Process preloading low priority in second - lowest quality
        for (i=0; i<preloadingLowPriorityQueue.length; ++i) {
            var task = preloadingLowPriorityQueue[0].task;
            var request = preloadingLowPriorityQueue[0].request;
            
            if (request.quality === 1) return task;
        }

        // Process preloading low priority in second - medium quality
        for (i=0; i<preloadingLowPriorityQueue.length; ++i) {
            var task = preloadingLowPriorityQueue[0].task;
            var request = preloadingLowPriorityQueue[0].request;
            
            if (request.quality === 2) return task;
        }

        // Process loading high priority first - pixeldata quality
        for (i=0; i<preloadingLowPriorityQueue.length; ++i) {
            var task = preloadingLowPriorityQueue[0].task;
            var request = preloadingLowPriorityQueue[0].request;
            
            if (request.quality === 101) return task;
        }

        // Process preloading low priority in second - lossless quality
        for (i=0; i<preloadingLowPriorityQueue.length; ++i) {
            var task = preloadingLowPriorityQueue[0].task;
            var request = preloadingLowPriorityQueue[0].request;
            
            if (request.quality === 100) return task;
        }

        return tasksToProcess[0] || null;
    };

    module.TaskPriorityPolicy = TaskPriorityPolicy;

})(window.osimis || (window.osimis = {}));