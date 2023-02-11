/**
 * Image model with mocked Image Binary Manager to avoid http requests.
 */
(function(osimis, mock) {
    'use strict';

    function Image(opts) {
        opts.Promise = opts.Promise || Promise; // should use $q!
        opts.id = opts.id || 'xxx';
        opts.availableQualities = opts.availableQualities || [
            osimis.quality.LOW,
            osimis.quality.MEDIUM,
            osimis.quality.LOSSLESS
        ];
        opts.annotations = opts.annotations || undefined; // { annotationType: [{data}, {data}, ...] }
        if (opts.imageBinaryManager && opts.imageBinariesCache) {
            throw new Error('Can\'t specify cache when an ImageBinaryManager is set manually');
        }
        opts.imageBinariesCache = opts.imageBinariesCache || null;
        opts.imageBinaryManager = opts.imageBinaryManager || new mock.ImageBinaryManager({
            Promise: Promise,
            cache: opts.imageBinariesCache,
            imageBinaries: {
                // Mock xxx image binaries
                'xxx': {
                    LOW: {
                        color: false,
                        height: 150,
                        width: 150,
                        rows: 150,
                        columns: 150,
                        sizeInBytes: 150*150,

                        columnPixelSpacing: 2,
                        rowPixelSpacing: 3,

                        minPixelValue: 0,
                        maxPixelValue: 2048,
                        slope: 1,
                        intercept: 0,
                        windowCenter: 1024,
                        windowWidth: 512,

                        originalHeight: 1750,
                        originalWidth: 1700,

                        render: function() {}
                    },
                    MEDIUM: {
                        color: false,
                        height: 1000,
                        width: 1000,
                        rows: 1000,
                        columns: 1000,
                        sizeInBytes: 1000*1000,

                        columnPixelSpacing: 2,
                        rowPixelSpacing: 3,

                        minPixelValue: 0,
                        maxPixelValue: 2048,
                        slope: 1,
                        intercept: 0,
                        windowCenter: 1024,
                        windowWidth: 512,

                        originalHeight: 1750,
                        originalWidth: 1700,

                        render: function() {}
                    },
                    LOSSLESS: {
                        color: false,
                        height: 1750,
                        width: 1700,
                        rows: 1750,
                        columns: 1700,
                        sizeInBytes: 1750*1700*2,

                        columnPixelSpacing: 2,
                        rowPixelSpacing: 3,

                        minPixelValue: 0,
                        maxPixelValue: 2048,
                        slope: 1,
                        intercept: 0,
                        windowCenter: 1024,
                        windowWidth: 512,

                        originalHeight: 1750,
                        originalWidth: 1700,

                        render: function() {}
                    }
                }
            }
        });

        // Mock imageBinaryManager & annotationManager
        var imageBinaryManager = opts.imageBinaryManager;
        var annotationManager = new osimis.AnnotationManager();

        // Fake image data
        var id = opts.id;
        var tags = {};
        var availableQualities = opts.availableQualities;
        var postProcesses = [];

        // Inherits from osimis.Image
        osimis.Image.call(
            this,
            imageBinaryManager,
            annotationManager,
            opts.id,
            tags,
            opts.availableQualities,
            postProcesses
        );

        // Mock annotations
        if (opts.annotations) {
            for (var annotationType in opts.annotations) {
                if (opts.annotations.hasOwnProperty(annotationType)) {
                    var annotationData = opts.annotations[annotationType];
                    this.setAnnotations(annotationType, annotationData);
                }
            }
        }
    }

    Image.prototype = Object.create(osimis.Image.prototype);

    mock.Image = Image;
})(this.osimis || (this.osimis = {}), this.mock || (this.mock = {}));