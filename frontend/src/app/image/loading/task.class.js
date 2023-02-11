/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.Task
 */
(function(module) {
    'use strict';

    /** new Task(options)
     *
     * @param options {type: <string>, ...}
     *
     */
    function Task(options) {
        this.type = options.type;

        // Options used to transmit the task to the worker
        this.options = options;

        // Called when task has been done
        this.onSucceed = new module.Listener();
        this.onFailure = new module.Listener();

        // Called when the user abort the task
        // Listened by the TaskWorker instance to send the message to the worker
        this.onAbort = new module.Listener();
    }

    Task.prototype.abort = function() {
        this.onAbort.trigger();
    };

    module.Task = Task;

})(window.osimis || (window.osimis = {}));