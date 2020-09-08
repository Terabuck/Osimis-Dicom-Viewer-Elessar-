/**
 * @ngdoc directive
 * @name webviewer.directive:wvExportViewportButton
 * 
 * @restrict Element
 * 
 * @description
 * The `wvExportViewportButton` displays a button on each viewport. When the button is
 * clicked, a new DICOM series is created with the image of the viewport, including the
 * annotations. This image is considered as a DICOM Key Image Note (see 
 * `http://wiki.ihe.net/index.php/Key_Image_Note`).
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvExportViewportButton', wvExportViewportButton);

    /* @ngInject */
    function wvExportViewportButton() {
        var directive = {
            bindToController: true,
            controller: ExportViewportButton,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            templateUrl: 'app/overlay/export-viewport-button.directive.html',
            scope: {
                imageId: '=wvImageId',
                csViewport: '=wvViewport',
                onExportEnded: '&?wvOnExportEnded'
            }
        };
        return directive;

        function link(scope, element, attrs) {
            var vm = scope.vm;
        }
    }

    /* @ngInject */
    function ExportViewportButton(wvImageManager, $element, $timeout, $rootScope, wvPaneManager) {
        var _this = this;

        this.captureViewportAsKeyImage = function(note) {
            var imageId = _this.imageId;
            var csViewport = _this.csViewport;

            // Q? Is the same zoom required / the same portion of the image as shown in the viewport, or full image is OK? --> Probably not OK.
            // Q? What is the final image dimension?
            // Q? Does non-measurement overlay has to be included within the image OK is it fine to add the info in an HTTP POST request.
            // see http://html2canvas.hertzen.com/

            // We can't retrieve the image based on the canvas as the canvas size is proportional on the end-user browser window dimension.
            // Instead, we do use this service (it creates a new hidden viewport with the appropriate size).

            // var viewportEl = $element.closest('wv-viewport');
            // var viewportEl = $element.closest('wv-viewport');
            var viewportEl = wvPaneManager.getSelectedPaneElement().find('wv-viewport');
            var canvasWidth = viewportEl.width();
            var canvasHeight = viewportEl.height();
            csViewport = csViewport.serialize(canvasWidth, canvasHeight);

            return wvImageManager.get(imageId).then(function(image){
                var captureWidth = image.instanceInfos.TagsSubset["Columns"] || 600;
                var captureHeight = image.instanceInfos.TagsSubset["Rows"] || 400;

                if (captureWidth < 512) { // if image is too small, the annotation will appear 'pixelized' -> increase the size
                    var upscaleRatio = 512 / captureWidth;
                    captureWidth = Math.round(captureWidth * upscaleRatio);
                    captureHeight = Math.round(captureHeight * upscaleRatio);
                }

                console.log("creating a new capture image (" + captureWidth + " x " + captureHeight + ")");

                wvImageManager
                    .captureViewportAsKeyImage(imageId, captureWidth, captureHeight, note, csViewport)
                    .then(function(data) {
                        $rootScope.$emit('studyChanged', data.Parent); // To make the series list reload the study                                        
                        if (_this.onExportEnded){
                            _this.onExportEnded();                            
                        }
                    });
            });
        };
    }
})();