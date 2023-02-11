/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.CornerstoneAnnotationSynchronizer
 * 
 * @description
 * The `CornerstoneAnnotationSynchronizer` class. Exclusively instantiated within the webviewer tools classes (see `viewport/image-plugins/` directory).
 *
 * # @lifecycle
 * Lifecycle is bound to *Viewports Grouped by imageId* (only for the viewports having the tool corresponding to the annotation enabled).
 * Although cornerstonejs can also bind annotation at the series level for instance, we don't use these kind in our
 * webviewer. On top of that, it's very unlickely such annotations rely on pixel-based coordinate (since pixel are defined at image
 * scope). We can therefore only bind the annotations bound by imageId.
 *
 * # @rationale
 * CornerstoneJS store annotations' coordinates in pixel and doesn't handle image's prgressive-resolution loading.
 * The `AnnotationSynchronizer` build a bridge between webviewer's annotations and cornerstone's annotations.
 * The former having the following advantages:
 * - Compatibility with progressive image loading (via resolution-independant annotation coordinates).
 * - Real-time update listeners (via polling).
 * - Persistant annotation storage (although newer cornerstoneTools version propose solutions).
 *
 * The `CornerstoneTools` library is completely independent from `CornerstoneJS`. Each tool render its annotations itself when 
 * the `CornerstoneRendered` event is triggered. The stored annotations are gathered from the CornerstoneTools `toolStateManager`
 * singleton. Since there is no other way, we have to convert the annotations' coordinate pixels instead of simply wrapping them.
 * There must only be one CornerstoneAnnotationSynchronizer by ImageId!
 */
(function(module) {
    'use strict';
    
    function CornerstoneAnnotationSynchronizer() { // cs for cornerstone

    }

    var _propertyConversionTable = {
        length: [
            'handles.start.x',
            'handles.start.y',
            'handles.end.x',
            'handles.end.y',
        ],
        rectangleRoi: [
            'handles.start.x',
            'handles.start.y',
            'handles.end.x',
            'handles.end.y',
        ],
        ellipticalRoi: [
            'handles.start.x',
            'handles.start.y',
            'handles.end.x',
            'handles.end.y',
        ],
        angle: [
            'handles.start.x',
            'handles.start.y',
            'handles.start2.x',
            'handles.start2.y',
            'handles.end.x',
            'handles.end.y',
            'handles.end2.x',
            'handles.end2.y',
        ],
        simpleAngle: [
            'handles.start.x',
            'handles.start.y',
            'handles.middle.x',
            'handles.middle.y',
            'handles.end.x',
            'handles.end.y',
        ],
        probe: [
            'handles.end.x',
            'handles.end.y',
        ],
        arrowAnnotate: [
            'handles.start.x',
            'handles.start.y',
            'handles.end.x',
            'handles.end.y',
            'handles.textBox.x',
            'handles.textBox.y',
            'handles.textBox.boundingBox.left',
            'handles.textBox.boundingBox.top',
        ]
    };

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneAnnotationSynchronizer
     * 
     * @name osimis.CornerstoneAnnotationSynchronizer#_retrieveResolutionScaleRatio
     * @param {object} baseResolution The base binary resolution
     * @param {object} newResolution The new binary resolution
     *
     * @description
     * # @warning This method expect resolution scale to be the same for both side (width and height),
     *            this constraint is not verified for performance reasons.
     */
    function _retrieveResolutionScaleRatio(baseResolution, newResolution) {
        return baseResolution.width / newResolution.width;
    }

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneAnnotationSynchronizer
     * 
     * @name osimis.CornerstoneAnnotationSynchronizer#syncByAnnotationType
     * 
     * @param {object} annotations
     * The cornerstone annotations of an imageId (for one tool). This is not
     * the `osimis.AnnotationValueObject` but rather the
     * `osimis.AnnotationValueObject.data` property!
     * 
     * @param {object} baseResolution
     * Old resolution, with values {height, width}, it's the binary resolution,
     * not necessarily the annotation one! This is why data.imageResolution takes
     * precedences over baseResolution when there is a conflict (for instance when
     * the annotations are downloaded over internet instead of written directly from the
     * viewport). This is important for features such as the liveshare.
     * 
     * @param {object} newResolution
     * New resolution, with values {height, width}
     * 
     * @description
     * Update (mutate) annotations to the new resolution.
     *
     * Mutation is done to keep the variable references with cornerstoneTools.
     */
    CornerstoneAnnotationSynchronizer.prototype.syncByAnnotationType = function(type, annotations, baseResolution, newResolution) {
        if (annotations === undefined || annotations.data === undefined) {
            return;
        }
        // For each annotation
        annotations.data.forEach(function(data) {
            // Use data.imageResolution in case baseResolution != data.imageResolution
            if (data.imageResolution) {
                baseResolution = data.imageResolution;
            }

            // If a resolution is already defined for these annotations,
            // convert data to the new one.
            if (baseResolution) {
                var resolutionScale = _retrieveResolutionScaleRatio(baseResolution, newResolution);
                var propertiesToConvert = _propertyConversionTable[type];

                _
                    .at(data, propertiesToConvert)
                    .forEach(function(value, index) {
                        // Retrieve the converted property name
                        var convertedProperty = propertiesToConvert[index];

                        // Convert the value
                        var convertedValue = value / resolutionScale;

                        // Replace the converted property's value
                        _.set(data, convertedProperty, convertedValue);
                    });
            }

            // Store newResolution as the binary resolution used to measure the annotations
            data.imageResolution = newResolution;
        });
    };

    module.CornerstoneAnnotationSynchronizer = CornerstoneAnnotationSynchronizer;

})(this.osimis || (this.osimis = {}));