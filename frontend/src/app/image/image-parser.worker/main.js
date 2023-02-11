/**
 *
 * Worker that retrieve and process image binaries.
 *
 * Can only process one request at a time.
 * User has to wait request end (or abort it using a command) to send a new one, otherwise it'll bug.
 *
 * As this is a web worker, we must share any information through messages
 * Therefore, 3 commands can be send from main thread (see the self.addEventListener call):
 * - setOrthancUrl — Configure the Orthanc API Url
 * - getBinary — Get an image binary
 * - abort - Cancel a request
 *
 * Imported scripts must be inlined to avoid path loading issues when used as a library
 *
 */

'use strict';

// @todo move jpgjs & pngjs out of bower_components

// Load libraries

// Import ArrayBuffer polyfill
/* @inline: */ importScripts('/app/image/image-parser.worker/array-buffer.polyfill.js');

// Import user agent parser
/* @inline: */ importScripts('/bower_components/ua-parser-js/dist/ua-parser.min.js');
var uaParser = (new UAParser()).getResult();

// Import bluebird promise polyfill
/* @inline: */ importScripts('/bower_components/bluebird/js/browser/bluebird.min.js');

// Import osimis.HttpRequest
/* @inline: */ importScripts('/app/utilities/http-request.class.js');

// Import KLVReader
/* @inline: */ importScripts('/app/image/image-parser.worker/klvreader.class.js');

// Import jpeg lib
/* @inline: */ importScripts('/bower_components/jpgjs/jpg.js');

// Import jpeg FFC3 lib
/* @inline: */ importScripts('/bower_components/jpeg-lossless-decoder-js/release/current/lossless-min.js');

// Import ParsedKlv
/* @inline: */ importScripts('/app/image/image-parser.worker/parsed-klv.class.js');

// Make png.js & config.js worker compatible
var document = {
    createElement: function() { return { getContext: function() {} } }
};
var window = {};

// Import png.js
/* @inline: */ importScripts('/bower_components/png.js/zlib.js');
/* @inline: */ importScripts('/bower_components/png.js/png.js');

var PNG = window.PNG;
var KLVReader = WorkerGlobalScope.KLVReader;


/** setImageApiUrl(locationUrl, orthancApiUrl)
 *
 * Configure the Orthanc API Url
 *
 **/
var OrthancApiURL = undefined;
var ImageApiURL = undefined;
function setImageApiUrl(orthancApiUrl) {
    // Set the route
    OrthancApiURL = orthancApiUrl;
    ImageApiURL = orthancApiUrl + '/osimis-viewer/images/';
}

// @todo out..
var Qualities = {
    // 0 is reserved as none..
    PIXELDATA: 101,
    LOSSLESS: 100,
    LOW: 1, // resampling to 150 px + compressed to jpeg100
    MEDIUM: 2 // resampling to 1000 px + compressed to jpeg100
};

/** Register commands from main thread **/
self.addEventListener('message', function(evt) {
    var type = evt.data.type;

    switch(type) {
    case 'setOrthancUrl':
        // Configure the ImageApiURl
        var orthancApiUrl = evt.data.orthancApiUrl;

        setImageApiUrl(orthancApiUrl);
        break;
    case 'getBinary':
        // Get an image binary
        var id = evt.data.id;
        var quality = evt.data.quality;
        var headers = evt.data.headers;
        var infos = evt.data.infos;

        getCommand(id, quality, headers, infos);
        break;
    case 'abort':
        // Abort a getCommand.
        // Do not reply anything, the reply is sent by the aborted getCommand.

        abortCommand();
        break;
    default:
        throw new Error('Unknown command');
    };
}, false);

var _processingRequest = null;

function abortCommand() {
    if (!_processingRequest) {
        // There is no reliable way to know from the main thread task has already been processed
        // so we just do nothing when it's the case
        return;
    }

    // Abort request (& answer via BinaryRequest failure - not sure its crossbrowser compatible)
    _processingRequest.abort();
}

/** Get & Decompress Image from Orthanc **/
function getCommand(id, quality, headers, infos) {
    if (_processingRequest) {
        throw new Error('Another request is already in process within worker thread.');
    }

    // Retrieve & process image data.
    _processingRequest = new BinaryRequest(id, quality, headers, infos);
    _processingRequest.execute();
}

function BinaryRequest(id, quality, headers, infos) {
    this.id = id;
    this.quality = quality;
    this.infos = infos;
    this.compressionFormat = null;
    this.headers = headers;

    // Parse url
    var splittedId = id.split(':');
    var instanceId = splittedId[0];
    var frameIndex = splittedId[1] || 0;
    
    var url = null;
    // Select the orthanc request url based on the desired image quality
    switch (quality) {
    case Qualities.PIXELDATA:
        url = ImageApiURL + instanceId + '/' + frameIndex + '/pixeldata-quality';

        switch (infos.TransferSyntax) {
            // Lossy JPEG 8-bit Image Compression.
            case '1.2.840.10008.1.2.4.50':
                this.compressionFormat = 'jpeg';
                break;
            // JPEG Lossless, Nonhierarchical, First-Order Prediction
            // (Default Transfer Syntax for Lossless JPEG Image
            // Compression). -- jpeg FFC3
            case '1.2.840.10008.1.2.4.70':
                this.compressionFormat = 'jpeg-lossless';
                break;
            default:
                throw new Error('Unsupported transfer syntax ' + infos.TransferSyntax);
        }
        break;
    case Qualities.LOSSLESS:
        url = ImageApiURL + instanceId + '/' + frameIndex + '/high-quality';
        this.compressionFormat = 'png';
        break;
    case Qualities.MEDIUM:
        url = ImageApiURL + instanceId + '/' + frameIndex + '/medium-quality';
        this.compressionFormat = 'jpeg';
        break;
    case Qualities.LOW:
        url = ImageApiURL + instanceId + '/' + frameIndex + '/low-quality';
        this.compressionFormat = 'jpeg';
        break;
    default:
        _processingRequest = null; // cleaning request
        throw new Error('Undefined quality: ' + quality);
    }

    // Create request
    this.request = new osimis.HttpRequest();
    this.request.setResponseType('arraybuffer');
    this.request.setHeaders(headers);
    this.url = url;
}
BinaryRequest.prototype.execute = function() {
    var request = this.request;
    var url = this.url;
    var quality = this.quality;
    var compressionFormat = this.compressionFormat;
    var infos = this.infos;

    // Trigger request
    Promise
        .all([
            request.get(url)
        ])
        .then(function(resp) {
            var imageResponse = resp[0];
            // var compressionFormat = resp[1];

            // Variable sent as a response to the main thread.
            var cornerstoneMetaData = null;
            var pixelArray = null;
            var pixelBufferFormat = null;

            // Process data.
            try {
                // Process all the data out of the klv.
                var parsedKlv = new osimis.ParsedKlv(compressionFormat, imageResponse.data, infos.TagsSubset);

                // Get decompressed image.
                pixelArray = parsedKlv.getPixels();

                // Get data required by cornerstone to display the image
                // correctly.
                cornerstoneMetaData = parsedKlv.getCornerstoneImageMetaData();

                // Stock the format of the array, to return the array's buffer
                // along its format's name instead of the array itself (array
                // can't be worker transferable object while buffer can).
                pixelBufferFormat = parsedKlv.getPixelBufferFormat();
            }
            catch (e) {
                // Clean the processing request in case of failure.
                _processingRequest = null;
                
                // Log the stacktrace.
                if (e.stack) {
                    console.log(e.stack);
                }

                // Rethrow exception.
                throw e;
            }

            // Answer request to the main thread
            if(uaParser.browser.name.indexOf('IE') !== -1 && uaParser.browser.major <= 11) {
                // IE10 fallback for transferable objects. see
                // `https://connect.microsoft.com/IE/feedback/details/783468/ie10-window-postmessage-throws-datacloneerror-for-transferrable-arraybuffers`
                // For some reason, it doesn't work on IE11 either, even if
                // support is stated in official doc and no reported bug has
                // been found (perhaps only when WIN SP1 is not installed?).
                self.postMessage({
                    type: 'success',
                    cornerstoneMetaData: cornerstoneMetaData,
                    pixelBuffer: pixelArray.buffer,
                    pixelBufferFormat: pixelBufferFormat
                });
            }
            else {
                self.postMessage({
                    type: 'success',
                    cornerstoneMetaData: cornerstoneMetaData,
                    pixelBuffer: pixelArray.buffer,
                    pixelBufferFormat: pixelBufferFormat
                }, [pixelArray.buffer]); // pixelArray is transferable
            }
            

            // Clean the processing request
            _processingRequest = null;
        })
        .then(null, function(response) {
            // May be called by abort (@todo not sure this behavior is crossbrowser compatible)
            self.postMessage({
                type: 'failure',
                status: response.status,
                response: response // send whole response in case the error has been done by a throw
            });

            // Clean the processing request
            _processingRequest = null;
        });
};

BinaryRequest.prototype.abort = function() {
    // Abort the http request
    this.request.abort();

    // The jpeg decompression can't be aborted (requires setTimeout loop during
    // decompression to allow a function to stop it asynchronously during the
    // event loop) Png decompression is done it two times so it could
    // potentially be stopped at half.
};
