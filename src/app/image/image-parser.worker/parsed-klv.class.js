/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.ParsedKlv
 * 
 * @description
 * The `osimis.ParsedKlv` class provide raw image pixels & image information
 * from an image KLV data blob & the related instance dicom tags. It's main
 * responsibility is to handle the image decompression.
 *
 * @requires `array-buffer` polyfill
 * @requires osimis.KLVReader
 * @requires jpgjs
 * @requires jpeg-lossless-decoder-js
 * @requires png.js
 *
 * @example
 * See `image-parser.worker/main.js` for examples.
 */
(function(osimis) {
    'use strict';

    function ParsedKlv(compressionFormat, buffer, tags) {
        // Process binary out of the klv.
        var klvData = _parseKLV(buffer);

        // Decompress image.
        var pixels = _decompressImage(compressionFormat, klvData, tags)

        // Process Min/Max pixel values. We don't rely on the one
        // given in the klvData, as it is unaccurate when the image has
        // been received in pixeldata quality. The cause is the
        // performance optimisation we do to avoid decompressing
        // precompressed dicom images in the backend.
        var pixelValuesBoundaries = _processPixelValuesBoundaries(pixels, tags);

        // Process windowing default values.
        var windowing = _processWindowing(pixels, klvData, tags, pixelValuesBoundaries.min, pixelValuesBoundaries.max);

        // Retrieve pixel spacing if available in dicom tags, so we can 
        // map pixel coordinates with physical ones.
        var columnPixelSpacing = 0;  // use really invalid values to make sure the user realizes the measure is invald (note: cornerstone will display pixels dimensions in this case)
        var rowPixelSpacing = 0;     // @todo Disable the measure tools in this case (note: this can be done later).
        if (tags.PixelSpacing) {
            var pixelSpacing = tags.PixelSpacing.split('\\');
            if (pixelSpacing.length === 2) {
                columnPixelSpacing = +pixelSpacing[1];
                rowPixelSpacing = +pixelSpacing[0];
            }
        }
        else if (tags.ImagerPixelSpacing) // at least used in XA studies
        {
            var pixelSpacing = tags.ImagerPixelSpacing.split('\\');
            if (pixelSpacing.length === 2) {
                columnPixelSpacing = +pixelSpacing[1];
                rowPixelSpacing = +pixelSpacing[0];
            }
        }
        // handle specific US measures
        else if (tags.SequenceOfUltrasoundRegions && tags.SequenceOfUltrasoundRegions.length == 1) // we are not able to handle multiple regions -> we could do it if they all have the same pixelSpacing
        {
            var usRegion = tags.SequenceOfUltrasoundRegions[0];
            if (usRegion.PhysicalUnitsXDirection == 3 && usRegion.PhysicalUnitsYDirection == 3) // only support 'cm' units (all other units are not length dimension like Hz, ...)
            {
                columnPixelSpacing = usRegion.PhysicalDeltaX * 10;     // columnPixelSpacing is in mm -> *10
                rowPixelSpacing = usRegion.PhysicalDeltaY * 10;     // columnPixelSpacing is in mm -> *10
            }
        }

        // Data required by cornerstone to display the image correctly.
        var cornerstoneMetaData = {
            // Used to display the image coreclty.
            height: klvData.height,
            width: klvData.width,
            rows: klvData.height,
            columns: klvData.width,
            color: tags.PhotometricInterpretation !== 'MONOCHROME1' && tags.PhotometricInterpretation !== 'MONOCHROME2',
            isSigned: !!(+tags.PixelRepresentation),

            // Unknown utility, probably required for the unused
            // cornerstone cache module.
            sizeInBytes: klvData.sizeInBytes,

            // Unknown utility, perhaps related to windowing/LUT,
            // seems unimpactful tough.
            minPixelValue: pixelValuesBoundaries.min,
            maxPixelValue: pixelValuesBoundaries.max,

            // Used to map pixel coordinates with physical ones in
            // cornerstoneTools.
            columnPixelSpacing: columnPixelSpacing,
            rowPixelSpacing: rowPixelSpacing,

            // Default windowing value.
            slope: windowing.slope,
            intercept: windowing.intercept,
            windowCenter: windowing.windowCenter,
            windowWidth: windowing.windowWidth,

            // Support MONOCHROME1 photometric interpretation (this
            // line will invert the grayscale map for monochrome1
            // images, so `0` pixel value is considered as white
            // instead of black). This fixes wrong plugin/orthanc image
            // interpretation (see
            // `https://bitbucket.org/sjodogne/orthanc/issues/44/bad-interpretation-of-photometric`).
            invert: tags.PhotometricInterpretation === 'MONOCHROME1',

            // Used by the webviewer's progressive image loading
            // mechanism to fake resized images as if they had the size
            // of the original/HQ image. Those values aren't used by
            // cornerstone at all.
            originalWidth: tags.Columns,
            originalHeight: tags.Rows
        };

        // Share data across methods.
        this._pixels = pixels;
        this._cornerstoneMetaData = cornerstoneMetaData;
    }

    /**
     * @ngdoc method
     * @methodOf osimis.ParsedKlv
     *
     * @name osimis.ParsedKlv#getPixels
     *
     * @return {Uint8Array|Int8Array|Uint16Array|int16Array}
     * The typed pixel array.
     * 
     * @description
     * This method returns a typed array containing the uncompressed pixels of
     * the image. We can easily retrieve the buffer out of it using 
     * `array.buffer`, and use that value as a `transferable object` to 
     * transfer data between a web worker and the main thread without having to
     * copy its memory blob.
     */
    ParsedKlv.prototype.getPixels = function() {
        return this._pixels;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ParsedKlv
     *
     * @name osimis.ParsedKlv#getCornerstoneImageMetaData
     *
     * @return {object}
     * The cornerstone metadata.
     * 
     * @description
     * This method returns an object with most of the metadata required to have
     * a cornerstone's image object. These meta data are meant to be transfered
     * from the webworker to the main thread. Thus, it lacks all the methods
     * required in the cornerstone image object since these can't be
     * transfered.
     */
    ParsedKlv.prototype.getCornerstoneImageMetaData = function() {
        return this._cornerstoneMetaData
    };

    /**
     * @ngdoc method
     * @methodOf osimis.ParsedKlv
     *
     * @name osimis.ParsedKlv#getPixelBufferFormat
     *
     * @return {string}
     * The array type.
     * 
     * @description
     * A typed array can't be transfered through web worker, although a raw
     * buffer can. The purpose of this method is to transfer the type of the
     * array, so it can be reconstructed in the main thread, after it has been
     * transfered from a web worker.
     */
    ParsedKlv.prototype.getPixelBufferFormat = function() {
        var pixelBufferFormat = null;

        // Stock the format of the array, to return the array's buffer along
        // its format's name instead of the array itself (array can't be worker
        // transferable object while buffer can).
        if (this._pixels instanceof Uint8Array) {
            pixelBufferFormat = 'Uint8';
        }
        else if (this._pixels instanceof Int8Array) {
            pixelBufferFormat = 'Int8';
        }
        else if (this._pixels instanceof Uint16Array) {
            pixelBufferFormat = 'Uint16';
        }
        else if (this._pixels instanceof Int16Array) {
            pixelBufferFormat = 'Int16';
        }
        else {
            throw new Error("Unexpected array binary format");
        }

        return pixelBufferFormat;
    };

    function _parseKLV(arraybuffer) {
        var klvReader = new KLVReader(arraybuffer);
        var keys = {
            // Value required by cornerstone (sent although we should be able to
            // retrieve those from the image decompression libraries).
            Height: 0, // {number} height after resizing
            Width: 1, // {number} width after resizing
            SizeInBytes: 2, // {number} size in raw prior to compression (but not resizing)

            // When 16bit image is converted to 8 bit (to be able to compress it in
            // jpeg), this value is used used convert image back to 16bit in the
            // web frontend with `minPixelValue` & `maxPixelValue`.
            MinPixelValue: 3, // {number} the floor value to unstretch pixels to.
            MaxPixelValue: 4, // {number} the ceiling value to unstretch pixels to.
            Stretched: 5, // {boolean} true if the image has to be unstretched.
            
            // The image binary.
            ImageBinary: 6
        };
        
        return {
            height: klvReader.getUInt(keys.Height),
            width: klvReader.getUInt(keys.Width),
            sizeInBytes: klvReader.getUInt(keys.SizeInBytes),

            minPixelValue: klvReader.getInt(keys.MinPixelValue),
            maxPixelValue: klvReader.getInt(keys.MaxPixelValue),
            isStretched: klvReader.getUInt(keys.Stretched),

            binary: klvReader.getBinary(keys.ImageBinary)
        };
    }

    function _decompressImage(compressionFormat, klvData, tags) {
        // Returned value.
        var pixelArray = null;

        // General values used everywhere.
        var isRgb32 = tags.PhotometricInterpretation !== 'MONOCHROME1' && tags.PhotometricInterpretation !== 'MONOCHROME2';
        var isSigned = !!(+tags.PixelRepresentation);
        
        // Decompress image binary into raw pixel.
        // @todo Use latest browser methods to do this faster.
        switch (compressionFormat.toLowerCase()) {
        case 'jpeg':
            // Decompress lossy jpeg
            // @note IE10 & safari tested/compatible
            pixelArray = _decompressJpeg(klvData.binary);
            
            // Stretch back dynamic if needed
            pixelArray = _stretchBackDynamic(pixelArray, {
                isRgb32: isRgb32,
                isSigned: isSigned,
                stretching: !klvData.isStretched ? null : {
                    // @note we still need to retrieve
                    //     klvData.min|maxPixelValue instead of using
                    //     dicom tags as we'll lose a ton' of dynamic
                    //     if we stretch to `2^tags.BitStored` (many
                    //     jpeg only use 9 bits out of the 12 `said` to
                    //     be stored by the BitsStored tag). We could
                    //     otherwise use 0 as low and 
                    //     `Math.pow(2, tags.BitsStored)` as high.
                    low: klvData.minPixelValue,
                    high: klvData.maxPixelValue
                }
            });
            break;
        case 'png':
            // Decompress lossless png
            // @note IE10 & safari tested/compatible
            pixelArray = _decompressPng({
                binary: klvData.binary,
                isRgb32: isRgb32,
                isSigned: isSigned
            });
            break;
        case 'jpeg-lossless':
            // Decompress lossless jpeg
            // @warning IE11 & safari uncompatible - actual fix is to
            //     always ask PNG conversion of PIXELDATA requested
            //     quality in LOSSLESS. This may provide issues if we
            //     for instance require availableQualities for other
            //     things than chosing the desired image formats (ie.
            //     add an indicator), but is not likely.
            pixelArray = _decompressJpegLossless({
                binary: klvData.binary,
                isSigned: isSigned
            });

            {
                // in WVB-338, we have seen pixels wrongly decoded by the jpeg-lossless decoder.  We have noticed the following mapping
                // between expected values and decompressed values:
                // 3984 -> 25572
                //  400 -> 24672
                //    0 -> 24576
                // after analysis, it appears that the decompressed values contain 2 1s at bits 13 & 14 which are outisde bits stored !!!
                // and, if these two bits are removed, the remaining value must be multiplied by 4.
                // So, let's hack !
                var maxPossiblePixelValue = Math.pow(2, +tags.BitsStored);
                if (pixelArray[0] > maxPossiblePixelValue && tags.BitsStored == 12 && (pixelArray[0] & 0x6000) == 0x6000) {
                    var bitsStoredMask = 0x0FFF;
                    for (var i=0; i < pixelArray.length; i++) {
                        pixelArray[i] = (pixelArray[i] & bitsStoredMask) * 4;
                    }
                }
            }
    
            break;
        }

        return pixelArray;
    }

    function _decompressJpeg(binary) {
        var jpegReader = new JpegImage();
        jpegReader.parse(binary);
        var s = jpegReader.getData(jpegReader.width, jpegReader.height);
        return s;
    }

    function _decompressJpegLossless(config) {
        var pixels;
        var decoder = new jpeg.lossless.Decoder();

        // Decompress to raw pixels.
        var s = new Uint8Array(decoder.decompress(config.binary.buffer));
        
        // Retrieve bits information.
        // `decoder.numComp === 3 -> rgb`
        // `decoder.numComp === 1 -> grayscale`
        // `decoder.numBytes === 1/2 -> 8bit/16bit`
        var bitCount = decoder.numBytes * 8;
        if (bitCount !== 8 && bitCount !== 16) {
            throw new Error("unsupported jpeg-lossless byte count: "+bitCount);
        }

        var isSigned = config.isSigned;

        var isRgb32;
        if (decoder.numComp === 1) {
            isRgb32 = false;
        }
        else if (decoder.numComp === 3) {
            isRgb32 = true;
        }
        else { // maybe rgba ? probably not.
            throw new Error("unsupported jpeg-lossless component number: "+decoder.numComp)
        }

        // Convert raw pixels to the appropriate format.
        var buf, pixels, index, i;
        if (isRgb32) {
            // Convert rgb24 to rgb32.
            buf = new ArrayBuffer(s.length / 3 * 4); // RGB32
            pixels = new Uint8Array(buf); // RGB24
            index = 0;
            for (i = 0; i < s.length; i += 3) {
                pixels[index++] = s[i];
                pixels[index++] = s[i + 1];
                pixels[index++] = s[i + 2];
                pixels[index++] = 255;  // Alpha channel
            }
        }
        else if (bitCount === 8 && !isSigned) {
            pixels = new Uint8Array(s.buffer);
        }
        else if (bitCount === 8 && isSigned) {
            pixels = new Int8Array(s.buffer);
        }
        else if (bitCount === 16 && !isSigned) {
            // Except jpeg to be little endian.
            pixels = new Uint16Array(s.buffer);
        }
        else if (bitCount === 16 && isSigned) {
            // Except jpeg to be little endian.
            pixels = new Int16Array(s.buffer);
        }
        else {
            throw new error("unsupported jpeg-lossless format");
        }

        return pixels;
    }

    function _decompressPng(config) {
        var pixels = null;
        var buf, index, i;

        var png = new PNG(config.binary);

        var s = png.decodePixels(); // returns Uint8 array

        if (config.isRgb32) {
            // Convert png24 to rgb32

            buf = new ArrayBuffer(s.length / 3 * 4); // RGB32
            pixels = new Uint8Array(buf); // RGB24
            index = 0;
            for (i = 0; i < s.length; i += 3) {
                pixels[index++] = s[i];
                pixels[index++] = s[i + 1];
                pixels[index++] = s[i + 2];
                pixels[index++] = 255;  // Alpha channel
            }
        } else if (png.bits === 16) {
            // Cast uint8_t array to (u)int16_t array
            
            pixels = _convertPngEndianness(s, config);

        }
        else if (png.bits === 8 && config.isSigned) {
            pixels = new Int8Array(s.buffer);
        }
        else if (png.bits === 8 && !config.isSigned) {
            pixels = new Uint8Array(s.buffer);
        }
        else {
            _processingRequest = null; // cleaning request
            throw new Error('unexpected png format');
        }

        return pixels;
    }
    // Raw is big endian..
    function _convertPngEndianness(s, config) {
        var pixels, buf, index, i, lower, upper;

        buf = new ArrayBuffer(s.length * 2); // uint16_t or int16_t
        if (config.isSigned) {
            // pixels = new Int16Array(buf);
            pixels = new Int16Array(s.buffer);
        } else {
            // pixels = new Uint16Array(buf);
            pixels = new Uint16Array(s.buffer);
        }

        index = 0;
        for (i = 0; i < s.length; i += 2) {
            // PNG is little endian
            upper = s[i];
            lower = s[i + 1];
            pixels[index] = lower + upper * 256;
            index++;
        }

        return pixels;
    }

    // if isRgb32
    //  -> Uint32 == Uint8 * 4 (RGBA)
    // 
    // if !isRgb32 && IsSigned
    //  -> Int16
    // 
    // if !isRgb32 && !IsSigned
    //  -> Uint16
    // 
    function _stretchBackDynamic(s, config) {
        var pixels = null;
        var buf, index, i;

        if (config.isRgb32) {
            buf = new ArrayBuffer(s.length / 3 * 4); // RGB32
            pixels = new Uint8Array(buf); // RGB24
            index = 0;
            for (i = 0; i < s.length; i += 3) {
                pixels[index++] = s[i];
                pixels[index++] = s[i + 1];
                pixels[index++] = s[i + 2];
                pixels[index++] = 255;  // Alpha channel
            }
        } else {
            buf = new ArrayBuffer(s.length * 2); // uint16_t or int16_t
            if (config.isSigned) {
                pixels = new Int16Array(buf);
            } else {
                pixels = new Uint16Array(buf);
            }

            index = 0;
            for (i = 0; i < s.length; i++) {
                pixels[index] = s[i];
                index++;
            }

            if (config.stretching) {
                _changeDynamics(pixels, 0, config.stretching.low, 255, config.stretching.high);
            }
        }

        return pixels;
    }

    function _changeDynamics(pixels, source1, target1, source2, target2) {
        var scale = (target2 - target1) / (source2 - source1);
        var offset = (target1) - scale * source1;

        for (var i = 0, length = pixels.length; i < length; i++) {
            pixels[i] = scale * pixels[i] + offset;
        }    
    }

    function _processPixelValuesBoundaries(pixelArray, tags) {
        var isRgb32 = tags.PhotometricInterpretation !== 'MONOCHROME1' && tags.PhotometricInterpretation !== 'MONOCHROME2';

        var maxPossiblePixelValue = Math.pow(2, +tags.BitsStored);
        var minPixelValue = null;
        var maxPixelValue = null;
        if (isRgb32) {
            // Do not bother calculating values for rgb images (the
            // dynamic is small for 8 bit luminosity, there is no point
            // in having something specific).
            minPixelValue = 0;
            maxPixelValue = maxPossiblePixelValue;
        }
        else {
            // Process min/max pixel value for greyscale images (can
            // be more than 8 bits).
            minPixelValue = maxPossiblePixelValue;
            maxPixelValue = 0;
            for (var i=0; i<pixelArray.length; ++i) {
                if (pixelArray[i] < minPixelValue) {
                    minPixelValue = pixelArray[i];
                }
                if (pixelArray[i] > maxPixelValue) {
                    maxPixelValue = pixelArray[i];
                }
            }
        }

        // Return result.
        return {
            min: minPixelValue,
            max: maxPixelValue
        }
    }

    function _processWindowing(pixelArray, klvData, tags, minPixelValue, maxPixelValue) {
        var isRgb32 = tags.PhotometricInterpretation !== 'MONOCHROME1' && tags.PhotometricInterpretation !== 'MONOCHROME2';
        
        var windowCenter = 0;
        var windowWidth = 0;

        // Adapt window width/center with the slope & intercept values.
        // Those calculation will be made internally by cornerstone,
        // with the following formulas:
        // `windowCenter = windowCenter * slope + intercept`
        // `windowWidth = windowWidth * slope`
        var slope = +tags.RescaleSlope || 1;
        var intercept = +tags.RescaleIntercept || 0;


        // If windowing dicom tags are available, use them
        if (tags.WindowCenter && tags.WindowWidth) {
            var windowCenters = tags.WindowCenter.split('\\');
            var windowWidths = tags.WindowWidth.split('\\');

            // Only take the first ww/wc available, ignore others (if 
            // there is any).
            windowCenter = +windowCenters[0] || 127.5;
            windowWidth = +windowWidths[0] || 256;
        }
        // If windowing dicom tags are not available, generate
        // default windowing values using min/max pixel values.
        else if (isRgb32) {
            // Do not bother calculating values for rgb images (the
            // dynamic is small for 8 bit luminosity, there is no point
            // in having something specific)
            windowCenter = 127.5;
            windowWidth = 256;
            slope = 1;
            intercept = 0;
        }
        else {
            // Process the threshold delta. When we process the windowing, we
            // need to set a threshold to bypass pixels used for overlay to
            // print information such as a 'G' position label printed in the
            // image. This can be achieved by bypassing the highest and lowest
            // pixels, from the min/max algorithm used to determine the default
            // windowing. In our samples, those overlay can also have value 
            // `0x010101` instead of `0x000`, that's why we bypass 2 values
            // insteead of just one.
            var thresholdDelta = 2;

            // However, consider the case when the image dynamic has been
            // compressed by the backend to 8 bits and stretched back for
            // instance to 16 bits. In this case, the lowest and topmost pixels
            // will have been multiplied by a value range of 255 (instead of
            // just 1 for the extreme value). We thus need to bypass those 255
            // values instead of just the topmost.
            if (klvData.isStretched) {
                // [0; 2^8] (8bits jpeg) -> stretched to [0;2^tags.BitsStored] (original image).
                // Q? how much values is done `n[0;255] = [0;2^tags.BitsStored]`.
                // -> What is n? Here is the solution:
                thresholdDelta *= Math.pow(2, tags.BitsStored)/Math.pow(2, 8);
            }

            // For grayscale (8 bits or more) images, process default
            // windowing. Ignore lower/higher bound for windowing
            // calculus, since many image include an overlay of that
            // color.
            var minPixelValueForWWWC = maxPixelValue;
            var maxPixelValueForWWWC = minPixelValue;
            for (var i=0; i<pixelArray.length; ++i) {
                if (pixelArray[i] < minPixelValueForWWWC && pixelArray[i] > minPixelValue + thresholdDelta) {
                    minPixelValueForWWWC = pixelArray[i];
                }
                if (pixelArray[i] > maxPixelValueForWWWC && pixelArray[i] < maxPixelValue - thresholdDelta) {
                    maxPixelValueForWWWC = pixelArray[i];
                }
            }
            // Make sure min/max for wwwc is realistic.
            minPixelValueForWWWC = minPixelValueForWWWC + thresholdDelta > maxPixelValueForWWWC ? minPixelValue : minPixelValueForWWWC;
            maxPixelValueForWWWC = minPixelValueForWWWC + thresholdDelta > maxPixelValueForWWWC ? maxPixelValue : maxPixelValueForWWWC;

            windowCenter = minPixelValueForWWWC + (maxPixelValueForWWWC - minPixelValueForWWWC) / 2 || 127.5;
            windowWidth = (maxPixelValueForWWWC - minPixelValueForWWWC) || 256;
        }

        // Return result.
        return {
            windowCenter: windowCenter, 
            windowWidth: windowWidth,
            slope: slope,
            intercept: intercept
        }
    }

    osimis.ParsedKlv = ParsedKlv;

})(this.osimis || (this.osimis = {}));