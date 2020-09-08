/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.OrthancUrlConvertor
 * 
 * @description
 * The `OrthancUrlConvertor` class is used to generate an absolute URL
 * from a relative URL based on the current page.
 * It aims to provide orthanc paths instead of local paths, it therefore
 * detects and removes '/osimis-viewer/app/...' from the actual location.
 *
 * Location parameters need to be manually filled at the instantiation for
 * testing reasons (as opposed to grabbing the global document.location object).
 *
 * @param {string} protocol - document.location.protocol (eg: "http:" - double point included!)
 * @param {string} hostname - document.location.hostname (eg: localhost)
 * @param {number} port - document.location.port (eg: 1431)
 * @param {string} pathname - document.location.pathname (eg: /something)
 */
(function(module) {

    function OrthancUrlConvertor(protocol, hostname, port, pathname) {
        this.protocol = protocol;
        this.hostname = hostname;
        this.port = port;
        // Warning: Safari bug - location.origin doesn't work on workers.
        this.origin = protocol + '//' + hostname + (port ? ':' + port : '');
        this.pathname = pathname;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.OrthancUrlConvertor
     * 
     * @name osimis.OrthancUrlConvertor#toAbsoluteURL
     * @param {string} url 
     *    The Orthanc config url.
     *    `url` must be absolute ('/...' or 'stg://.../...' but not '.../...').
     *    It will be converted to absolute 'stg://.../...'. See 'orthanc-url-convertor.spec.js'
     *    for more details.
     * @return {string} The absolute URL
     */
    OrthancUrlConvertor.prototype.toAbsoluteURL = function(url) {
        // Check the path is absolute
        // (because workers are built to blob strings, their location is not relative to the js main thread one.)
        if (url.indexOf('://') === -1 && url.indexOf('/') !== 0) {
            throw new Error('should be an absolute path');
        }

        // Prefix protocol explicitely for network path reference / RFC 3986 (to fix wrong protocol issue due to blob url resolving to blob://server:port)
        if (url.indexOf('//') === 0) {
            url = this.protocol + url;
        }

        // Prefix relative path with http://server:port/[...] (to fix wrong protocol issue due to blob url resolving to blob://server:port)
        if (url.indexOf('://') === -1) {
            var locationUrl = this.origin + this.pathname;
            var regex = /^([^:]*:\/\/)([^\/]*)(\/?.*)$/; // <1: protocol> (eg. https://) + <2: ip[:port]> + <3: /...> (eg. orthanc.vivalife.be:3123/...)
            var result = locationUrl.match(regex);
            var locationOrigin = result[1] + result[2];

            // if <1: ...> + <2: /osimis-viewer/app/*.html> is present, prefix from that level.
            if (result.length >= 3 && result[3]) {
                var regex2 = /^(\/?.*)(\/osimis-viewer\/app)(\/[\w-]+\.html)/; // <1: prefix> + <2: ...> (eg. /apiroot/osimis-viewer/app/*.html?...)
                var result2 = result[3].match(regex2);
                if (result2 && result2.length > 1 && result2[1]) {
                    locationOrigin += result2[1];
                }
            }

            url = locationOrigin + url;
        }

        // Remove trailing slashes
        while (url.lastIndexOf('/') === url.length - 1) {
            url = url.slice(0, -1);
        }

        return url;
    };

    module.OrthancUrlConvertor = OrthancUrlConvertor;

})(window.osi ? window.osi : (window.osi = {}));