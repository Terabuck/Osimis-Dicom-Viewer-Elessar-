(function() {
    'use strict';

    angular
        .module('webviewer')
        .factory('WvColorMaskPostProcessor', WvColorMaskPostProcessor)
        .run(function(wvImageManager,  WvColorMaskPostProcessor) {
            wvImageManager.registerPostProcessor('colormask', WvColorMaskPostProcessor);
            // @todo register
        });

    /* @ngInject */
    function WvColorMaskPostProcessor(_, $q) {
    	// needs data

        /**
         * new ColorMask(imageId: string [, ...])
         */
        function ColorMask() {
            this.masksImageIds = Array.prototype.slice.call(arguments);
        }

        ColorMask.prototype.execute = function(inputPixelObject, getMaskPixelsFromImageId) {
            _convertToColor(inputPixelObject);

        	// @todo postprocess
        	// @todo should not be a promise but clean data
        	var maskPixelObjectPromises = this.masksImageIds.map(function(maskImageId) {
                return getMaskPixelsFromImageId(maskImageId);
            });

            return $q
                .all(maskPixelObjectPromises)
                .then(function(maskPixelObjects) {
                    return maskPixelObjects.reduce(function (inputPixelObject, maskPixelObject) { // @todo CHECK IF REDUCE ARGS ARE OK
                        _convertToColor(maskPixelObject);
                       return _applyMask(inputPixelObject, maskPixelObject);
                    }, inputPixelObject);
                });
        };

        function _convertToColor(pixelObject) {
            if (pixelObject.color) return;

            var originalPixels = pixelObject.getPixelData();
            pixelObject.getPixelData = function() {
                var buf = new ArrayBuffer((originalPixels.length) * 4); // /2 for int16->uint8 -- *4 for Greyscale->RGB32
                var resultPixels = new Uint8Array(buf);
                var index = 0;
                for (var i = 0; i < originalPixels.length; ++i) {
                    resultPixels[index++] = originalPixels[i]; // @todo normalize (but clampedarray should do it)
                    resultPixels[index++] = originalPixels[i]; // @todo normalize
                    resultPixels[index++] = originalPixels[i]; // @todo normalize
                    resultPixels[index++] = 255;  // Alpha channel
                }

                return resultPixels;
            };

            pixelObject.color = true;
            // change sizeInBytes
            // maxPixelValue 
            pixelObject.render = cornerstone.renderColorImage;
        } 

        function _applyMask(pixelObject, maskObject) {
            var result = _.cloneDeep(pixelObject);
            // @todo make efficient
            
            var data1 = result.getPixelData(); // take data prior to changing the function
            var data2 = maskObject.getPixelData();
            result.getPixelData = function() {
                for (var i=0; i<data1.length; i+=4) {
                    if (data2[i+0] > 0) {
                        data1[i+0] = data1[i+0]/2 + data2[i+0]/2; // r
                        //data1[i+1] = data2[i+1] - data2[i+1]; // g
                        //data1[i+2] = data2[i+2] - data2[i+2]; // b
                        // data1[i+3] = data2[i+3]; // a
                    }
                }
                
                return data1;
            }

            return result;
        }

        return ColorMask;
    }
})();