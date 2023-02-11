/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.Listener
 *
 * @example
 * object constructor:
 * ```js
 *  this.onSomethingHappened = new osimis.Listener();
 *  this.onSomethingHappened.trigger(arg1, arg2);
 * ```
 *
 * user:
 * ```js
 *  object.onSomethingHappened(this, function(arg1, arg2) { 
 *      // react..
 *  });
 * 
 * object.onSomethingHappened.close(this)
 * ```
 */
(function(root) {
    'use strict';

    function OsimisListener() {
    	var _listeners = [];

        // listen method
        // arguments: [namespace], callback
    	function OsimisListener(arg1, arg2) {
            var callback = arg2 || arg1; // callback is the last argument
            var namespace = arg2 && arg1; // namespace is the first argument - only if there is two args

    		if (namespace) {
    		    callback.namespace = namespace;
    		}
    		
    		_listeners.push(callback);
    	};

    	// listen once method
    	var _random = 0;
    	OsimisListener.once = function(callback) {
    	    var random = _random++;
    	    OsimisListener('.<_^_>. ]MONDOSHAWANS'+random+'[ .<_^_>.', function() {
    	        callback.apply(this, arguments);
    	        OsimisListener.close('.<_^_>. ]MONDOSHAWANS'+random+'[ .<_^_>.');
    	    });
    	};

        // unlisten method
        OsimisListener.close = function(namespace) {
            if (!namespace) {
                _listeners = []
            }
            else {
                _.remove(_listeners, function(listener) {
                    return listener.namespace && _compareNamespace(listener.namespace, namespace);
                });
            }

        }

        // dont trigger for namespace during the wrappedCodeCallback
        OsimisListener.ignore = function(namespace, wrappedCodeCallback) {
            _listeners.forEach(function(listener) {
                if (_compareNamespace(listener.namespace, namespace)) {
                    listener.ignore = true;
                }
            });
            
            wrappedCodeCallback();

            _listeners.forEach(function(listener) {
                if (_compareNamespace(listener.namespace, namespace)) {
                    listener.ignore = false;
                }
            });
        };

        // trigger method
    	OsimisListener.trigger = function() {
    	    var args = Array.prototype.splice.call(arguments, 0);
	       
            // The listeners may throws exceptions. if the event is
            // triggered within a promise, these exceptions are swallowed
            // by the external promise. We wan't to separate the promises
            // from the Listener (which are in the end two different patterns
            // for the same kind of use cases).
            // Therefore, we launch the callbacks within asap,
            // as JS microtask using so the listener's exceptions are not
            // swallowed by potential promises containing the trigger.
            // We use asap instead of setTimeout (for instance) to make
            // sure we don't trigger reflows inbetween the callbacks
            // calls (which may be really slow).
            try {
                _listeners
                    .filter(function(listener) {
                        return !listener.ignore;
                    })
                    .forEach(function(listener) {
                        listener.apply(null, args);
                    });
            }
            catch (e) {
                // We only use asap when an exception is thrown:
                // even with asap instead of setTimeout, we have
                // a perf drop from 60FPS to 20FPS on play speed
                // after tests. We can keep these 60FPS this way,
                // and especially avoid leaving requestAnimationFrame
                // method due to the use of osimis.Listener.
                asap(function() {
                    throw e;
                });
            }
    	};

        // return listen method (= functor)
    	return OsimisListener;
    }
    
    function _compareNamespace(n1, n2) {
        if (!_.isArray(n1) || !_.isArray(n2)) {
            return n1 === n2;
        }
        else {
            // shallow comparison
            return _.isEqualWith(n1, n2, function(n1, n2) {
                return n1.length === n2.length && n1.reduce(function(result, value, idx) {
                    return result && value === n2[idx];
                }, true);
            });
        }
    }

    root.Listener = OsimisListener;
})(window.osimis || (window.osimis = {}));