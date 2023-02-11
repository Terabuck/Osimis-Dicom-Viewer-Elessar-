/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.WorkerPool
 * @param {object} options
 *   
 *   Options:
 *   * {string} `path` The path to the script of the worker.
 *      script may be inlined here using either Osimis' gulp-inline-worker
 *      script or URL Blob Workers.
 *   * {number} `workerCount` Minimum 2 (one is always kept for high priority
 *     displays).
 *   * {function} `createPromiseFn` see:
 *     `function(wrappedFunction: (resolve, reject)=>Any): Promise`.
 *   * {function} `taskPriorityPolicy` A configurable to set the priority of
 *     the task. see task-priority-policy.class.js for an example.
 *
 * @description
 * The `WorkerPool` instantiate multiple TaskWorkers (~= threads),
 * the WorkerPool's user can either assign task to the pool or broadcast message to every TaskWorkers.
 * When a task is assigned to the pool, the WorkerPool waits for an available TaskWorker and assign the
 * task as soon as possible.
 * 
 * # @usage:
 *  // in workerScript: just listen to message & post message back (only once) or throw..
 *  Worker listens to message evt.data.type (with specific type: 'abort')
 *  They respond {type: 'success', ...} or {type: 'failure', ...}
 *  
 * # To Test:
 *  - does throw in workerScript result in failed promise
 *  - can a new taskOptions be performed after an uncatched throw in a workerScript
 *  - is the post message be sure to not be called after a throw in a workerScript
 */
(function(module) {
    'use strict';

    /**
     * @constructor osimis.WorkerPool
     */
    function WorkerPool(options) {
        var _this = this;
        
        this._path = options.path;

        if (options.workerCount < 2) {
            throw new Error('WorkerPool must have at least 2 workers');
        }
        else {
            this._workerCount = options.workerCount || 2;
        }

        if (!options.createPromiseFn) {
            throw new Error('createPromiseFn argument required');
        }
        else {
            this._createPromiseFn = options.createPromiseFn
        }

        /** _availableTaskWorkers
         *
         * @Queue
         *
         * Available Worker Thread Instances
         *
         */
        this._availableTaskWorkers = [];

        /** _availableTaskWorkers
         *
         * @Queue
         *
         * Busy Worker Thread Instances
         *
         */
        this._busyTaskWorkers = [];


        /** _tasksToProcess
         *
         * @PriorityQueue - Sorted by policy
         *
         */
        this._tasksToProcess = [];

        /** _tasksInProcess
         *
         * @Queue
         *
         */
        this._tasksInProcess = [];

        /** _taskPriorityPolicy: Object
         *
         * Used to determine which task is chosen
         *
         * @interface _taskPriorityPolicy
         *   #selectTask(availableWorkers, busyWorkers, tasksToProcess, tasksInProcess)
         *
         */
        this._taskPriorityPolicy = options.taskPriorityPolicy;

        // Initialize workers
        for (var i=0; i<this._workerCount; ++i) {
            // Create Worker - Put them in the available queue
            var taskWorker = new module.TaskWorker(this._path);
            this._availableTaskWorkers.push(taskWorker);

            // Use a closure to copy taskWorker reference at each iteration
            (function(taskWorker) {
                taskWorker.onAvailable(function() {
                    // Move worker from busy queue to available queue
                    _.pull(_this._busyTaskWorkers, taskWorker);
                    _this._availableTaskWorkers.push(taskWorker);

                    // Process a task
                    _this._processQueuedTaskInAvailableWorker();
                });
            })(taskWorker);
        }
    }

    /**
     * @ngdoc method
     * @methodOf osimis.WorkerPool
     * 
     * @name osimis.WorkerPool#queueTask
     * @param {object} taskOptions {type: <string>, ...}
     * @return {Promise<TaskResult>} Once the taskOptions has finished (
     *                               succeded, failed or aborted).
     */
    WorkerPool.prototype.queueTask = function(taskOptions) {
        var _this = this;

        var task = new module.Task(taskOptions);

        this._tasksToProcess.push(task);

        this._processQueuedTaskInAvailableWorker();

        // Returne promise bound to task events
        return this._createPromiseFn(function(resolve, reject) {
            task.onSucceed(_this.queueTask, function(result) {
                // Close event listeners
                task.onFailure.close(_this.queueTask);
                task.onSucceed.close(_this.queueTask);
                // Resolve
                resolve(result);
            });
            task.onFailure(_this.queueTask, function(reason) {
                // Close event listeners
                task.onFailure.close(_this.queueTask);
                task.onSucceed.close(_this.queueTask);
                // Reject
                reject(reason);
            });
        });
    };

    /**
     * @ngdoc method
     * @methodOf osimis.WorkerPool
     * 
     * @name osimis.WorkerPool#broadcastMessage
     * @param {object} message Any object sent as a message to every of the
     *                         threads.
     * 
     * @description
     * Send a message to every existing threads, used mainly for configuration
     * purpose.
     */
    WorkerPool.prototype.broadcastMessage = function(message) {
        var taskWorkers = _.concat(this._availableTaskWorkers, this._busyTaskWorkers);

        taskWorkers.forEach(function(worker) {
            worker.postMessage(message);
        });
    };
    
    /**
     * @ngdoc method
     * @methodOf osimis.WorkerPool
     * 
     * @name osimis.WorkerPool#_objectMatchFilter
     * @param {object} object The input object.
     * @param {object} filter The filtering object.
     * @return {bool} True if object contains match filter.
     *
     * @description
     * Check an object match a filter.
     * Properties from object not contained in the filter are ignored (the comparison continues).
     */
    function _objectMatchFilter(object, filter) {
        var isCompatible = true;

        // Compare each properties (ignore properties not set in object)
        for (var prop in filter) {
            if (filter.hasOwnProperty(prop)) {
                isCompatible &= _.isEqual(object[prop], filter[prop]);
            }
        }

        return !!isCompatible; // "!!" to make sure it returns boolean
    }

    /**
     * @ngdoc method
     * @methodOf osimis.WorkerPool
     * 
     * @name osimis.WorkerPool#abortTask
     * @param {object} taskOptionsFilter synthax: {type: <string>, ...}
     *                                   Filter used to select the tasks.
     *                                   Properties not set in taskOptionsFilter
     *                                   are matched by default. For instance,
     *                                   if taskOptionsFilter == {}, every task
     *                                   will be matched.
     *
     * @description
     * Abort a task, this method throws when task is inexistant or when
     * multiple tasks are aborted at once.
     *
     * Compare the tasks in _tasksToProcess and remove them from the queue.
     * Compare the tasks in _tasksInProcess and abort them.
     */
    WorkerPool.prototype.abortTask = function(taskOptionsFilter) {
        // Remove task from the toProcess queue (if here)
        // @todo optimize (actually 50ms process) -> sorted by quality + tree research on id ?
        var sizeBefore = this._tasksToProcess.length;
        _.pullAllWith(this._tasksToProcess, [taskOptionsFilter], function(task, taskOptionsFilter) {
            return _objectMatchFilter(task.options, taskOptionsFilter);
        });
        var sizeAfter = this._tasksToProcess.length;

        // Abort task from the inProcess queue
        var cancelledTaskCount = sizeBefore - sizeAfter;
        for (var i=this._tasksInProcess.length-1; i>=0; --i) { // loop in reverse so we can remove items without breaking the loop iterations
            var task = this._tasksInProcess[i];
            if (_objectMatchFilter(task.options, taskOptionsFilter)) {
                task.abort();
                ++cancelledTaskCount;
                _.pull(this._tasksInProcess, task);
            }
        }
    
        // Throw an exception no task was removed 
        if (cancelledTaskCount !== 1) {
            throw new Error('One task must be aborted instead of ' + cancelledTaskCount + '!');
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.WorkerPool
     * 
     * @name osimis.WorkerPool#_processQueuedTaskInAvailableWorker
     * 
     * @description
     * Called everytime a worker is available or a new task is added
     */
    WorkerPool.prototype._processQueuedTaskInAvailableWorker = function() {
        var _this = this;

        // Make sure the task is processed after any event listeners are bound to the task
        window.setTimeout(function() {
            // Do nothing if there is no available worker or task to process
            if (_this._availableTaskWorkers.length === 0) {
                return;
            }
            if (_this._tasksToProcess.length === 0) {
                return;
            }

            // Retrieve both the first available task & worker
            var task = _this._taskPriorityPolicy.selectTask(
                _this._availableTaskWorkers,
                _this._busyTaskWorkers,
                _this._tasksToProcess,
                _this._tasksInProcess
            );

            // Cancel if no task has been chosen
            if (!task) {
                return;
            }

            var worker = _this._availableTaskWorkers[0];

            // Switch task from taskToProcess queue to taskInProcess queue
            _.pull(_this._tasksToProcess, task);
            _this._tasksInProcess.push(task);

            // Switch worker from available to busy queue
            _.pull(_this._availableTaskWorkers, worker);
            _this._busyTaskWorkers.push(worker);

            // Remove from taskInProcess once the task has been processed
            task.onSucceed(_this._processQueuedTaskInAvailableWorker, function() {
                task.onSucceed.close(_this._processQueuedTaskInAvailableWorker);
                task.onFailure.close(_this._processQueuedTaskInAvailableWorker);
                _.pull(_this._tasksInProcess, task);
            });
            task.onFailure(_this._processQueuedTaskInAvailableWorker, function() {
                task.onSucceed.close(_this._processQueuedTaskInAvailableWorker);
                task.onFailure.close(_this._processQueuedTaskInAvailableWorker);
                _.pull(_this._tasksInProcess, task);
            });

            // Assign task to the taskWorker
            worker.processTask(task);
        });
    };
    module.WorkerPool = WorkerPool;

})(window.osimis || (window.osimis = {}));