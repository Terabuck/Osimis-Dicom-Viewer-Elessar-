
(function() {
    'use strict';
    /**
     * @ngdoc directive
     * @name webviewer.directive:wvOrientationMarkerViewportTool
     *
     * @restrict A
     * @requires wvViewport
     */
    angular
        .module('webviewer')
        .directive('wvOrientationMarkerViewportTool', wvOrientationMarkerViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvOrientationMarkerViewportTool'] = '?^wvOrientationMarkerViewportTool';

                return $delegate;
            });
        })
        .run(function(wvInstanceManager) {
            var _tagsByInstanceId = {};

            // Cache instances tags since we can't rely on promise and our API
            // only provide promises getter for tags.
            wvInstanceManager
                .onTagsSet(function(instanceId, tags) {
                    _tagsByInstanceId[instanceId] = tags;
                });

            // Bind a new cornerstone tool metadata provider to our
            // instanceManager.
            cornerstoneTools.metaData.addProvider(metaDataProvider);
            function metaDataProvider(type, imageId) {
                if (type === 'imagePlane') {
                    for (var instanceId in _tagsByInstanceId) {
                        if (imageId.indexOf(instanceId) === 0) {
                            var tags = _tagsByInstanceId[instanceId];

                            // Ignore method if required DICOM tags are not
                            // available.
                            if (!tags.Rows ||
                                !tags.Columns ||
                                !tags.ImageOrientationPatient ||
                                !tags.ImagePositionPatient ||
                                !tags.PixelSpacing ||
                                !tags.SliceThickness
                            ) {
                                return undefined;
                            }

                            var imageOrientation = tags.ImageOrientationPatient.split('\\');
                            var imagePosition = tags.ImagePositionPatient.split('\\');
                            var pixelSpacing = tags.PixelSpacing.split('\\');

                            // Return result & end loop.
                            return {
                                // see http://dicom.nema.org/medical/Dicom/2015a/output/chtml/part03/sect_C.7.4.html
                                frameOfReferenceUID: tags.FrameOfReferenceUID,

                                // Retrieve from tag
                                // @warning May differ from loaded quality!
                                rows: parseFloat(tags.Rows),
                                columns: parseFloat(tags.Columns),

                                // See ftp://dicom.nema.org/MEDICAL/dicom/2015b/output/chtml/part03/sect_C.7.6.2.html

                                // Retrieved from tag `Image Orientation (Patient)`
                                rowCosines: new cornerstoneMath.Vector3(parseFloat(imageOrientation[0]), parseFloat(imageOrientation[1]), parseFloat(imageOrientation[2])),
                                columnCosines: new cornerstoneMath.Vector3(parseFloat(imageOrientation[3]), parseFloat(imageOrientation[4]), parseFloat(imageOrientation[5])),

                                // Retrieve from tag  Image Position (Patient)`
                                imagePositionPatient: new cornerstoneMath.Vector3(parseFloat(imagePosition[0]), parseFloat(imagePosition[1]), parseFloat(imagePosition[2])),
                                rowPixelSpacing: parseFloat(pixelSpacing[0]),
                                columnPixelSpacing: parseFloat(pixelSpacing[1]),
                                sliceThickness: parseFloat(tags.SliceThickness)
                            };     
                        }
                    }
                }
            }
        });

    /* @ngInject */
    function wvOrientationMarkerViewportTool($parse, WvBaseTool) {
        var directive = {
            require: 'wvOrientationMarkerViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {

        }

        /* @ngInject */
        function Controller() {
            cornerstoneTools.orientationMarkers.setConfiguration({
                drawAllMarkers: true
            });
        }
        
        /**
         * @ngdoc method
         * @methodOf webviewer.directive:wvOrientationMarkerViewportTool
         *
         * @name webviewer.directive:OrientationMarkerViewportTool#register
         * 
         * @param {osimis.Viewport} viewport
         * The registered viewport class.
         *
         * @description
         * Method called by the viewport directive controller to be registered
         * to this tool, so we can poll data out of it (see
         * `#_listenViewChange` method).
         */
        Controller.prototype.register = function(viewport) {
            var _this = this;

            var enabledElement = viewport.getEnabledElement();
            cornerstoneTools.orientationMarkers.enable(enabledElement);

            viewport.draw(false);

            // This tool also requires imagePlane cornerstone meta data. Those
            // are filled in the instance manager.
        }
        
        Controller.prototype.unregister = function(viewport) {
            // noop (at least AM-JE think so)
        }

        return directive;
    }

})();