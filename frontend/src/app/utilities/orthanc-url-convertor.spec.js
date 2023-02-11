/* jshint -W117, -W030 */
describe('utilities', function() {

    describe('URLConvertor#toAbsoluteURL(url)', function () {

        it('should convert "/" backend path based on window.location when reverse proxy is detected', function() {
            // When the front end is served by the C++ back-end server (implies wvConfig.orthancUrl = '/')
            // but is located behind a reverse proxy (implies location.pathname to be prefixed).

            // Relative orthanc URL setting
            var orthancConfigUrl = '/';


            /** Test with default port setting **/ 

            // Expected orthanc URL
            var orthancAbsoluteUrl = 'http://medbrief-staging.infology.net/matter/1/radiology/orthanc/renderrer/11';

            // HTML page where the request is done
            var origin = {
                protocol: 'http:',
                hostname: 'medbrief-staging.infology.net',
                port: undefined,
                // We can see the usual "/osimis-viewer/..." is prefixed
                pathname: '/matter/1/radiology/orthanc/renderrer/11//' +
                         'osimis-viewer/app/plugin-entrypoint.html' +
                         '?study=2d81423'
            };

            // Convert URL
            var urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            var convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one (without ports)
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);


            /** Test with specific port setting **/

            // Expected orthanc URL
            orthancAbsoluteUrl = 'http://medbrief-staging.infology.net:5631/matter/1/radiology/orthanc/renderrer/11';

            // HTML page where the request is done
            origin = {
                protocol: 'http:',
                hostname: 'medbrief-staging.infology.net',
                port: 5631,
                // We can see the usual "/osimis-viewer/..." is prefixed
                pathname: '/matter/1/radiology/orthanc/renderrer/11//' +
                         'osimis-viewer/app/plugin-entrypoint.html' +
                         '?study=2d81423'
            };

            // Convert URL
            urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);
        });

        it('should keep "/" path when page is served by standard C++ back-end server config', function() {
            // When the front end is *not* served by the C++ back-end server
            // (for instance when using localhost to debug front end)

            // Relative orthanc URL setting
            var orthancConfigUrl = '/';


            /** Test with default port setting **/ 

            // Expected orthanc URL
            var orthancAbsoluteUrl = 'http://localhost';

            // HTML page where the request is done
            var origin = {
                protocol: 'http:',
                hostname: 'localhost',
                port: undefined,
                pathname: '/osimis-viewer/app/plugin-entrypoint.html?study=2d81423'
            };

            // Convert URL
            var urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            var convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one (without ports)
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);


            /** Test with specific port setting **/

            // Expected orthanc URL
            orthancAbsoluteUrl = 'http://localhost:8042';

            // HTML page where the request is done
            origin = {
                protocol: 'http:',
                hostname: 'localhost',
                port: 8042,
                pathname: '/osimis-viewer/app/plugin-entrypoint.html?study=2d81423'
            };

            // Convert URL
            urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);
        });


        it('should keep "/" path when no reverse proxy is detected', function() {
            // When the front end is *not* served by the C++ back-end server
            // (for instance when using localhost to debug front end)

            // Relative orthanc URL setting
            var orthancConfigUrl = '/';


            /** Test with default port setting **/ 

            // Expected orthanc URL
            var orthancAbsoluteUrl = 'http://localhost';

            // HTML page where the request is done
            var origin = {
                protocol: 'http:',
                hostname: 'localhost',
                port: undefined,
                // We can see "/index.html" is served
                pathname: '/'
            };

            // Convert URL
            var urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            var convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one (without ports)
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);


            /** Test with specific port setting **/

            // Expected orthanc URL
            orthancAbsoluteUrl = 'http://localhost:5631';

            // HTML page where the request is done
            origin = {
                protocol: 'http:',
                hostname: 'localhost',
                port: 5631,
                // We can see "/index.html" is served
                pathname: '/'
            };

            // Convert URL
            urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);
        });

        it('should keep "/stg/" path when no reverse proxy is detected', function() {
            // When the front end is *not* served by the C++ back-end server
            // (implies wvConfig.orthancUrl is manually set)

            // Relative orthanc URL setting
            var orthancConfigUrl = '/stg/';


            /** Test with default port **/

            // Expected orthanc URL
            var orthancAbsoluteUrl = 'http://localhost/stg';

            // HTML page where the request is done
            var origin = {
                protocol: 'http:',
                hostname: 'localhost',
                port: undefined,
                // The usual "/osimis-viewer/..." is not in the pathname because we
                // use don't call this request from the front end served by
                // the c++ back end. 
                pathname: '/'
            };

            // Convert URL
            var urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            var convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);


            /** Test with custom port **/
            
            // Expected orthanc URL
            orthancAbsoluteUrl = 'http://localhost:3143/stg';

            // HTML page where the request is done
            origin = {
                protocol: 'http:',
                hostname: 'localhost',
                port: 3143,
                // The usual "/osimis-viewer/..." is not in the pathname because we
                // use don't call this request from the front end served by
                // the c++ back end. 
                pathname: '/'
            };

            // Convert URL
            urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);
        });

        it('should always keep "stg1://stg2/stg3" absolute path', function() {
            // When the front end is *not* served by the C++ back-end server
            // (implies wvConfig.orthancUrl is manually set)

            /** Test with default port **/

            // Relative orthanc URL setting
            var orthancConfigUrl = 'ptth://tsohlacol/gts/...';

            // Expected orthanc URL
            var orthancAbsoluteUrl = 'ptth://tsohlacol/gts/...';

            // HTML page where the request is done
            var origin = {
                protocol: 'extern:',
                hostname: 'localhost',
                port: 4313,
                // Pathname doesn't matter 
                pathname: '/'
            };

            // Convert URL
            var urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            var convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);


            /** Test with custom port **/
            
            // Relative orthanc URL setting
            orthancConfigUrl = 'ptth://tsohlacol:3421/gts/...';

            // Expected orthanc URL
            orthancAbsoluteUrl = 'ptth://tsohlacol:3421/gts/...';

            // HTML page where the request is done
            origin = {
                protocol: 'extern:',
                hostname: 'localhost',
                port: undefined,
                // Pathname doesn't matter
                pathname: '/fagaef'
            };

            // Convert URL
            urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);
        });

        it('should convert "//stg2/stg3" absolute path to "stg1://stg2/stg3" (network path reference - RFC 3986)', function() {
            // When the front end is *not* served by the C++ back-end server
            // (implies wvConfig.orthancUrl is manually set)
            // Useful to make config parameter both compatible with http and https.

            /** Test with default port **/

            // Relative orthanc URL setting
            var orthancConfigUrl = '//tsohlacol/gts/...';

            // Expected orthanc URL
            var orthancAbsoluteUrl = 'stg1://tsohlacol/gts/...';

            // HTML page where the request is done
            var origin = {
                protocol: 'stg1:',
                hostname: 'localhost',
                port: 4313,
                // Pathname doesn't matter 
                pathname: '/'
            };

            // Convert URL
            var urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            var convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);


            /** Test with custom port **/
            
            // Relative orthanc URL setting
            orthancConfigUrl = '//tsohlacol:3421/gts/...';

            // Expected orthanc URL
            orthancAbsoluteUrl = 'stg1://tsohlacol:3421/gts/...';

            // HTML page where the request is done
            origin = {
                protocol: 'stg1:',
                hostname: 'localhost',
                port: undefined,
                // Pathname doesn't matter
                pathname: '/fagaef'
            };

            // Convert URL
            urlConvertor = new osi.OrthancUrlConvertor(origin.protocol, origin.hostname,
                                                    origin.port, origin.pathname);
            convertedConfigUrl = urlConvertor.toAbsoluteURL(orthancConfigUrl);

            // Check converted url equals expected one
            assert.equal(convertedConfigUrl, orthancAbsoluteUrl);
        });

    });

});
