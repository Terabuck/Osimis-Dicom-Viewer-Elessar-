/**
 * @ngdoc service
 *
 * @name webviewer.service:wvConfig
 *
 * @description
 * The `wvConfig` provider is used:
 *   * To retrieve the web-viewer version.
 *   * To retrieve frontend configuration (defined from backend config files).
 *   * To configure user authentication (see the httpRequestHeaders method documentation below).
 *
 * # @warning Web Viewer is uncompatible with <base> HTML element (due to SVG/XLink issue)! Don't use it!
 *
 * The `Configuration` class handle the general webviewer config,
 * and versioning informations. This is much like a private local POJO-like
 * class.
 *
 * It is meant only to be used by the `wvConfig` service. However, that service
 * gives a public access to an unique _instance_ of this class.
 *
 * ```json
 * {
 *     "version": {
 *         "webviewer": "x.x.x-...",
 *         "orthanc": "x.x.x",
 *         "db": "x.x.x"
 *     },
 *     "browser": {}, // returns { ua: '', browser: {}, cpu: {}, device: {}, engine: {}, os: {} } - see https://github.com/faisalman/ua-parser-js #getResult()
 *     "orthancApiURL": "http://stg:8421/xxx",  // absolute path used by workers to use correct orthanc url
 *     "httpRequestheaders": {} // Additionnal headers that can be set by user (only used for Lify atm)
 * }
 * ```
 **/
(function() {
    'use strict';

    /**
     * @constructor Configuration
     */
    function Configuration() {
        this.version = typeof window.__webViewerConfig !== 'undefined' && __webViewerConfig.version;

        this.browser = {};

        var urlConvertor = new osi.OrthancUrlConvertor(
            document.location.protocol,
            document.location.hostname,
            document.location.port,
            document.location.pathname);
        this.orthancApiURL = urlConvertor.toAbsoluteURL('/'); // @note '/' is converted by urlConvertor
                                                              // to the correct path if reverse proxy is found, so np.
                                                              // @todo use ../../ instead

        this.httpRequestHeaders = {};

        // by default, all query arguments are transformed into headers (for passing the auth token)
        if (window.URLSearchParams !== undefined) {
            var urlParams = urlParams = new URLSearchParams(window.location.search);
            var that = this;
            urlParams.forEach(function(value, key) {
                that.httpRequestHeaders[key] = value;
            })

            if (urlParams.get("language")) {
                __webViewerConfig.defaultLanguage = urlParams.get("language");
            }
        }
        this.config = __webViewerConfig;

        if (__webViewerConfig.customOverlayProviderUrl) {
            console.log("Custom overlay provider URL from config file: ", __webViewerConfig.customOverlayProviderUrl);
            this.config.customOverlayProviderUrl = urlConvertor.toAbsoluteURL(__webViewerConfig.customOverlayProviderUrl);
            console.log("Custom overlay provider URL (computed): ", this.config.customOverlayProviderUrl);
        } else {
            console.log("No custom overlay provider defined");
        }
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvConfig
     *
     * @name webviewer.service:wvConfig#setHttpRequestHeaders
     * @param {object} headers A hash containing the HTTP headers we wan't to insert in each request
     *
     * @description
     * WebViewer is not responsible for authentication. However, it is quite often embedded behind a proxy.
     * It's therefore convenient to provide the additional user informations to the proxy. The `wvConfig.setHttpRequestHeaders`
     * method can be used to set an user token.
     *
     * The host application has to keep the token up to date. The web viewer doesn't handle refresh. If the token expires while
     * the web viewer is being used, the end user will have to reload the page.
     *
     * `setHttpRequestHeaders` has to be called by the host at module initialization (unless configuration routes are on public
     * access) and each time the token expires (see example in the setHttpRequestHeaders method's documentation).
     *
     * # @note Would be better to propose a policy. However, we can't pass policies to web workers, so this solution is not
     * technically achievable.
     *
     * @example
     * The following example show how to use the `wvConfig` provider to set an user token.
     *
     * ```js
     * angular.module('new-module', ['webviewer'])
     * .run(function(wvConfig) {
     *     // This is called at run time (can be called from anywhere in AngularJS host app). It should be called again
     *     // each time the token is invalidated (preferably before, but will not be required once we have a "retry request"
     *     // mechanism).
     *     var newUserToken = 'renewed-user-token';
     *
     *     wvConfig.setHttpRequestHeaders({
     *         'my-auth-header': newUserToken
     *     });
     * });
     * ```
     */
    Configuration.prototype.setHttpRequestHeaders = function(headers) {
        // @note We make sure not to change the _config.httpRequestHeaders reference

        // Clean header
        for (var prop in this.httpRequestHeaders) {
            if (this.httpRequestHeaders.hasOwnProperty(prop)) {
                delete this.httpRequestHeaders[prop];
            }
        }

        // Copy header
        _.assign(this.httpRequestHeaders, headers);
    };

    angular
    .module('webviewer')
    .provider('wvConfig', function() {
        // @todo use angular.injector for scoped config?

        this._config = new Configuration();

        // @warning @deprecated No longer required.
        //
        // Make sure the httpRequestHeaders configuration option is available before module initialization so we can use it to
        // verify webviewer frontend/backend version compatibility at start.
        // The option is also available after initialization in case the headers have to be changed for instance because of an
        // expired token.
        //
        // We don't have to set this if the following routes are on public access
        // - /plugins/osimis-web-viewer
        // - /system
        this.setHttpRequestHeaders = this._config.setHttpRequestHeaders.bind(this._config);

        this.$get = function($q, uaParser) {
            // This is executed at runtime (after initialization)

            // Add browser to config (for log mainly)
            this._config.browser = uaParser.getResult();

            console.log("Webviewer config: ", this._config);

            return this._config;
        };
    });

})();
