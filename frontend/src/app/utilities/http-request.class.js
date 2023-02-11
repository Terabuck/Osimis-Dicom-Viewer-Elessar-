/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.HttpRequest
 * 
 * @description
 * Wrapper over the xhr object. 
 * Its user need to set `HttpRequest.Promise` variable before usage.
 *
 * # Rational
 * We need a concrete way to handle http requests and set additional headers both from AngularJS and the web workers.
 * This class has been developed because most xhr wrappers don't provide control over xhr.responseType, or aren't fit
 * for usage within web workers (due to call to the window object).
 * 
 * We also intent to extend this later to support asynchronous header injection (which may implies a specific communication
 * funel between workers and the main thread).
 *
 * @example
 * See unit tests for examples.
 */
(function(osimis) {
    /**
     * @type {object}
     *
     * @description
     * Super cache object at global scope.
     *
     * Keys are the URL of the request.
     * Values are Promises of the request result. 
     * 
     * Cache is disabled by default.
     */
    var _cache = {};

    /**
     * @constructor osimis.HttpRequest
     */
    function HttpRequest() {
        this._httpHeaders = {};

        this._xhr = new XMLHttpRequest();
        
        // Use JSON by default - can be overriden via headers
        this._defaultContentType = 'application/json';
        this._httpHeaders['Content-type'] = this._defaultContentType;
        this._defaultAcceptHeader = 'application/json, text/plain, */*';
        this._httpHeaders['Accept'] = this._defaultAcceptHeader;
        this._responseType = 'json';

        // Disable cache by default
        this._cacheEnabled = false;

        // Check against dual send of a request (_send should only be called once with this implementation
        // due to the actual usage of xhr callback)
        this._hasBeenSent = false;
    }

    /**
     * @ngdoc property
     * @propertyOf osimis.HttpRequest
     *
     * @name osimis.HttpRequest.Promise
     * @type {Function}
     * 
     * @description
     * Can be overriden by user. We recommand to use $q for AngularJS and to keep native promises for workers.
     * Be careful the implementation is Promise/A+ compliant, see my comment here
     * https://github.com/chrisdavies/plite/issues/4#issuecomment-247022165.
     *
     * @todo change native promise by some lib if we need IE compatibility http://caniuse.com/#search=promise
     */
    HttpRequest.Promise = (Promise && function(resolver) {
        // Wrap native promises
        return new Promise(resolver);
    }) || undefined;

    /**
     * @ngdoc property
     * @propertyOf osimis.HttpRequest
     *
     * @name osimis.HttpRequest.timeout
     * @type {number} 0 is infinity
     *
     * @description
     * Timeout in millisecond, useful for tests.
     * See xhr.timeout property.
     */
    HttpRequest.timeout = 0;

    /**
     * @ngdoc method
     * @methodOf osimis.HttpRequest
     * 
     * @name osimis.HttpRequest#setCache
     * @param {boolean} enableCache Activate/Deactivate the global cache for this request
     * 
     * @description
     * Activate/Deactivate global cache for the actual request.
     * 
     * The result's promise is cached, not the result itself (to avoid dual requests for instance).
     * Failed requests invalidate the cache.
     *
     * # @warning `setCache` should only be used for GET requests.
     * 
     * # @note The cache is based on exact URL matching, therefore, a trailing slash request may not
     *   use the same cache as a non-trailing slash request, even if the same resource is sent.
     */
    HttpRequest.prototype.setCache = function(enableCache) {
        this._cacheEnabled = !!enableCache;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.HttpRequest
     * 
     * @name osimis.HttpRequest#setHeaders
     * @param {object} headers HTTP headers hashmap
     * 
     * @description
     * Used mainly to add user credentials.
     */
    HttpRequest.prototype.setHeaders = function(headers) {
        // Clone the header object (make sure we never change the passed object, especially since it's very likely it's
        // a direct reference to the main configuration object).
        // Use JSON instead of lodash to lower dependency in workers.
        headers = JSON.parse(JSON.stringify(headers));

        // Store the headers for conveniance until they are added to xhr object (which must
        // be 'opened' first)
        this._httpHeaders = headers;

        // Set back default 'Content-type' & 'Accept' if not present
        this._httpHeaders['Content-type'] = headers.hasOwnProperty('Content-type') ? headers['Content-type'] : this._defaultContentType;
        this._httpHeaders['Accept'] = headers.hasOwnProperty('Accept') ? headers['Accept'] : this._defaultAcceptHeader;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.HttpRequest
     * 
     * @name osimis.HttpRequest#setResponseType
     * @param {string} responseType Equivalent to XMLHTTPRequest.responseType.
     *    * 'arraybuffer'
     *    * 'json'
     *    * ...
     * 
     * @description
     * Used to retrieve binary data. See XMLHTTPRequest.responseType.
     * This method doesn't have to be used when retrieving JSON data (this is the default).
     */
    HttpRequest.prototype.setResponseType = function(responseType) {
        this._responseType = responseType;

        // Remove default json Accept header when not using json anymore
        if (responseType !== 'json' && this._httpHeaders['Accept'] === this._defaultAcceptHeader) {
            delete this._httpHeaders['Accept'];
        }
        // Set it back if we use json again and haven't overriden it
        else if (responseType === 'json' && this._httpHeaders['Accept'] === this._defaultAcceptHeader) {
            this._httpHeaders['Accept'] === this._defaultAcceptHeader;
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.HttpRequest
     * 
     * @name osimis.HttpRequest#get
     * @param {string} url The destination of the HTTP request
     * @return {Promise<object>} The result of the request
     * 
     * @description
     * Send an HTTP GET request to _url_.
     */
    HttpRequest.prototype.get = function(url) {
        return this._send('GET', url);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.HttpRequest
     * 
     * @name osimis.HttpRequest#post
     * @param {string} url The destination of the HTTP request
     * @param {object} data Input data sent via the POST method
     * @return {Promise<object>} The result of the request
     *
     * @description
     * Send an HTTP POST request to _url_.
     */
    HttpRequest.prototype.post = function(url, data) {
        return this._send('POST', url, data);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.HttpRequest
     * @deprecated Not implemented at the moment.
     * 
     * @name osimis.HttpRequest#put
     * @param {string} url The destination of the HTTP request
     * @param {object} data Input data sent via the POST method
     * @return {Promise<object>} The result of the request
     * 
     * @description
     * Send an HTTP PUT request to _url_.
     */
    HttpRequest.prototype.put = function(url, data) {
        return this._send('PUT', url, data);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.HttpRequest
     * @deprecated Not implemented at the moment.
     * 
     * @name osimis.HttpRequest#delete
     * @param {string} url The destination of the HTTP request
     * @return {Promise<object>} The result of the request
     * 
     * @description
     * Send an HTTP DELETE request to _url_.
     *
     * @note Commented until we really need it. Need additional unit test once uncomment.
     */
    // HttpRequest.prototype.delete = function(url) {
    //     return this._send('DELETE', url);
    // };

    /**
     * @description
     * Send an HTTP request to _url_.
     * 
     * @ngdoc method
     * @methodOf osimis.HttpRequest
     * 
     * @name osimis.HttpRequest#_send
     * @param {string} method The HTTP method type of the call (eg. GET, ...)
     * @param {string} url The destination of the HTTP request
     * @param {object} [data] Additional input data sent via the request (ie. for POST method)
     * @return {Promise<object>} The result of the request
     */
    HttpRequest.prototype._send = function(method, url, inputData) {
        var Promise = HttpRequest.Promise;
        var xhr = this._xhr;
        var cacheEnabled = this._cacheEnabled;
        var headers = this._httpHeaders;
        var responseType = this._responseType;

        // Check against dual send of a request (_send should only be called once with this implementation
        // due to the actual usage of xhr callback).
        if (this._hasBeenSent) {
            throw new Error('HttpRequest should only be sent once');
        }

        // Serialize inputData
        if (inputData && headers.hasOwnProperty('Content-type')) {
            inputData = JSON.stringify(inputData);
        }

        // Set request method, url and async mode
        xhr.open(method, encodeURI(url), true); // true: async xhr request because we wan't to be able to abort the request

        // Set timeout (mostly used for tests)
        xhr.timeout = HttpRequest.timeout;
        
        // Inject the headers in the xhr object (now that the xhr object has been opened)
        for (var prop in headers) {
            if (headers.hasOwnProperty(prop)) {
                xhr.setRequestHeader(prop, headers[prop]);
            }
        }

        // Inject the response type (now that the xhr object has been opened)
        xhr.responseType = responseType;

        if (cacheEnabled && _cache[url]) {
            // Return the cached version if available & cache is enabled
            return _cache[url];
        }
        else {
            // Wrap response in promise
            var requestPromise = Promise(function(resolve, reject) {
                // Set callback on request success/failure
                xhr.onreadystatechange = function() {
                    // Only check finished requests
                    if (xhr.readyState !== XMLHttpRequest.DONE) {
                        return;
                    }
                    else {
                        // Remove listener once triggered, should have no effect since the DONE state should only happen once
                        xhr.onreadystatechange = null;
                    }

                    // Retrieve response data
                    try {
                        // @note use responseType instead of xhr.responseType and (typeof xhr.response !== 'string') for IE11 compatibility
                        // see https://connect.microsoft.com/IE/feedback/details/794808
                        var data =
                            typeof xhr.response !== 'undefined' && typeof xhr.response !== 'string'
                            ? xhr.response
                            : (responseType === 'json' && xhr.responseText && JSON.parse(xhr.responseText) || xhr.responseText || null);
                    }
                    catch(e) {
                        // Result is probably not json, log the true result
                        throw new Error('Failed to parse to JSON: ' + xhr.responseText);
                    }

                    if (xhr.status === 200) {
                        // Resolve the xhr result with the same scheme as AngularJS#$http
                        // @note requests with status 30x are automatically redirected by the browser
                        resolve({
                            data: data,
                            status: xhr.status,
                            statusText: xhr.statusText,
                            headers: xhr.getResponseHeader.bind(xhr)
                        });
                    }
                    else {
                        // Invalidate cache
                        if (cacheEnabled && _cache[url]) {
                            // Don't delete cache entry (time consuming), only mark property as undefined
                            _cache[url] = undefined;
                        }

                        // Reject the xhr result with the same scheme as AngularJS#$http
                        reject(new HttpRequestError({
                            data: data,
                            status: xhr.status,
                            statusText: xhr.statusText,
                            headers: xhr.getResponseHeader.bind(xhr)
                        }));
                    }
                };

            });

            // Cache request
            if (cacheEnabled) {
                _cache[url] = requestPromise;
            }

            // Trigger request (asyncronously)
            xhr.send(inputData);
            
            // Prevent additional requests
            this._hasBeenSent = true;

            return requestPromise;
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.HttpRequest
     * 
     * @name osimis.HttpRequest#abort
     * 
     * @description
     * Cancel the sent XHR request.
     * Must be used after #get/#post/#put/#delete/...
     */
    HttpRequest.prototype.abort = function() {
        // Check the request has been sent
        if (!this._hasBeenSent) {
            throw new Error('HttpRequest can only abort sent requests');
        }

        // Abort the http request
        this._xhr.abort();
    };

    // Http Exception Type
    function HttpRequestError(opts) {
        this.name = 'HttpRequestError';
        this.message = 'Failed HTTP request';
        this.stack = (new Error()).stack;

        this.data = opts.data;
        this.status = opts.status;
        this.statusText = opts.statusText;
        this.headers = opts.headersFn
    }
    HttpRequestError.prototype = new Error;
    HttpRequest.HttpRequestError = HttpRequestError;

    osimis.HttpRequest = HttpRequest;
})(typeof WorkerGlobalScope !== 'undefined' ?
    (self.osimis || (self.osimis = {})) // use osimis osimis on workers
    : (window.osimis || (window.osimis = {})) // use osimis osimis on main thread
);