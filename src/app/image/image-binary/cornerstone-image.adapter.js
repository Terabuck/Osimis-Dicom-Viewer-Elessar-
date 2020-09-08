/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.CornerstoneImageAdapter
 *
 * @description
 * The `CornerstonImageAdapter` class creates an image binary (cornerstone pixel
 * object) from a backend response.
 */
(function(osimis) {
    'use strict';

    function CornerstoneImageAdapter(cornerstone) {
        // Declare deps
        this._cornerstone = cornerstone;
    }

    CornerstoneImageAdapter.prototype.process = function(imageId, qualityLevel, metaData, pixelBuffer, pixelBufferFormat) {
        var cornerstone = this._cornerstone;

        // @todo check if this variable is required, remove it if not, write why otherwise
        metaData.imageId = imageId;
        metaData.qualityLevel = qualityLevel;
        
        var resamplingScale = metaData.width / metaData.originalWidth;
        metaData.columnPixelSpacing = metaData.columnPixelSpacing / resamplingScale;
        metaData.rowPixelSpacing = metaData.rowPixelSpacing / resamplingScale;

        if (metaData.color) {
            metaData.render = cornerstone.renderColorImage;
        }
        else {
            metaData.render = cornerstone.renderGrayscaleImage;
        }
        
        // wrap back buffer into an array
        // create pixelArray out of getPixelData for caching
        // pixelBufferFormat mimics the binary RAW format of the image. For
        // instance, if image is 16bit grey scale, it'll be (U)Int16. For
        // (a)RGB it's mostly Uint8. Cornerstone interpret them differently to
        // draw the image in the canvas. In the end, canvas always uses 8bits
        // views though.
        var pixelArray = null
        switch (pixelBufferFormat) {
        case 'Uint8':
            pixelArray = new Uint8Array(pixelBuffer);
            break;
        case 'Int8':
            pixelArray = new Int8Array(pixelBuffer);
            break;
        case 'Uint16':
            pixelArray = new Uint16Array(pixelBuffer);
            break;
        case 'Int16':
            pixelArray = new Int16Array(pixelBuffer);
            break;
        default:
            throw new Error("Unexpected array binary format");
        }

        metaData.getPixelData = function() {
            return pixelArray;
        };
        
        return metaData;
    };

    osimis.CornerstoneImageAdapter = CornerstoneImageAdapter;

    angular
        .module('webviewer')
        .factory('wvCornerstoneImageAdapter', wvCornerstoneImageAdapter);

    /* @ngInject */
    function wvCornerstoneImageAdapter(cornerstone) {
        return new osimis.CornerstoneImageAdapter(cornerstone);
    }
})(this.osimis || (this.osimis = {}));