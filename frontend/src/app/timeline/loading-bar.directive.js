/**
 * @ngdoc directive
 * @name webviewer.directive:wvLoadingBar
 * 
 * @param {osimis.Series} wvSeries The model of the series, as provided by the
 *                                 `wvSeriesId` directive.
 *                                 
 * @param {boolean} [wvReadonly=false] Deactivate the directive's inputs.
 * 
 * @scope
 * @restrict Element
 * 
 * @description
 * The `wvLoadingBar` directive displays a timeline relative to a shown series.
 *
 * Every series' images are represented on the loading bar. The user can
 * clicked upon one of them to select it. The displayed images also provide the 
 * actual status of the download: 
 *   * `grey` - The image has not been downloaded at all
 *   * `red` - The image thumbnail has been downloaded
 *   * `orange` - The low-quality version of the image has been downloaded
 *   * `green` - The lossless-quality version of the image has been downloaded
 *               Note the green quality does not always mean the image is 
 *               lossless: an image saved in the PACS as compressed appears 
 *               green even, since the best quality available has been provided.
 *
 * This directive is used by the `wvTimeline` directive.
 *
 * # @compatibility Do not use html <base> tag! cf.
 *     http://www.chriskrycho.com/2015/html5-location-base-and-svg.html#fn1
 *     Check the `wvLoadingBar` directive source code for more information.
 */ 
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvLoadingBar', wvLoadingBar);

    /* @ngInject */
    function wvLoadingBar() {
        var directive = {
            templateNamespace: 'svg',
            replace: true, // required for svg databinding
            templateUrl: 'app/timeline/loading-bar.directive.html',
            bindToController: true,
            controller: Controller,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
            	series: '=wvSeries',
                readonly: '=?wvReadonly'
            }
        };
        return directive;

        function link(scope, element, attrs) {
            scope.vm.imageQualities = [];
        }
    }

    /* @ngInject */
    function Controller($scope, wvImageBinaryManager, wvSynchronizer, wvReferenceLines) {
        var _this = this;

        // Set default values
        this.readonly = (typeof this.readonly === 'undefined') ? false : this.readonly;

        this.wvSynchronizer = wvSynchronizer;
        this.wvReferenceLines = wvReferenceLines;
        
        // [<image index>: [<image quality: int>, ...], ...] - image-index != image-id
        this.imageQualities = [];
        // [<image index>: <image quality: int> , ...] - image-index != image-id
        this.bestQualityByImage = [];

        this.QualityKeys = _.invert(osimis.quality);
        // $scope.$watch('vm.series.id', function(seriesId) {

        // });

        // Show current loading image
        this.currentImageIndex = null;
        $scope.$watch('vm.series', function(newSeries, oldSeries) {
            // Unbind the old series if exists
            if (oldSeries) {
                // Close listeners
                oldSeries.onCurrentImageIdChanged.close(_this);

                // Clean the datas
                _this.imageQualities = [];
                _this.imageCount = 0;
                _this.imageBarWidth = 0;
            }

            // Set the new series if exists
            if (newSeries) {
                // Set actual image
                _this.currentImageIndex = newSeries.currentIndex;

                // Set bar size
                _this.imageCount = newSeries.imageCount;
                _this.imageBarWidth = 100 / _this.imageCount; // in percentage

                // Listen to actual image
                newSeries.onCurrentImageIdChanged(_this, function(imageId) {
                    _this.currentImageIndex = newSeries.getIndexOf(imageId);
                });
                // @todo close on destroy

                // Retrieve already cached series' image list
                _this.imageQualities = newSeries.listCachedImageBinaries();

                // Get the best quality of each image so we can draw its color
                _this.bestQualityByImage = _this
                    .imageQualities
                    .map(function(imageQualities) {
                        // Get the highest imageQuality number
                        var bestQuality = imageQualities.reduce(function(previous, current) {
                            if (previous === null || current > previous) {
                                return current;
                            }
                            else {
                                return previous;
                            }
                        }, null);

                        return bestQuality;
                    });
            }

            // _this.series is updated via databinding (_this.series === $scope.vm.series)
        });

        wvImageBinaryManager.onBinaryLoaded(_this, function(imageId, imageQuality) {
            // Be sure a series is available
            var series = _this.series;
            if (!series) {
                return;
            }

            // Filter the current series
            var imageIndex = series.getIndexOf(imageId);
            if (imageIndex === -1) {
                return;
            }

            // Create the array of available qualities
            // if (!_this.imageQualities[imageIndex]) {
            //     _this.imageQualities[imageIndex] = [];
            // }

            // Store the quality
            _this.imageQualities[imageIndex].push(imageQuality);
            // Recalculate the best quality in cache
            if (!_this.bestQualityByImage[imageIndex] || imageQuality > _this.bestQualityByImage[imageIndex]) {
                _this.bestQualityByImage[imageIndex] = imageQuality;
            }
        });
        wvImageBinaryManager.onBinaryUnLoaded(_this, function(imageId, imageQuality) {
            // Be sure a series is available
            var series = _this.series;
            if (!series) {
                return;
            }

            // Filter the current series
            var imageIndex = series.getIndexOf(imageId);
            if (imageIndex === -1) {
                return;
            }

            // Unstore the unloaded quality
            _.pull(_this.imageQualities[imageIndex], imageQuality);
            // Recalculate the best quality in cache
            _this.bestQualityByImage = _this
                .imageQualities
                .map(function(imageQualities) {
                    // Get the highest imageQuality number
                    var bestQuality = imageQualities.reduce(function(previous, current) {
                        if (previous === null || current > previous) {
                            return current;
                        }
                        else {
                            return previous;
                        }
                    }, null);

                    return bestQuality;
                });
        });

        $scope.$on('$destroy', function() {
            wvImageBinaryManager.onBinaryLoaded.close(_this);
            wvImageBinaryManager.onBinaryUnLoaded.close(_this);
        });

    }

    Controller.prototype.goToImage = function(i) {
        this.series.goToImage(i);
        this.wvSynchronizer.update(this.series);
        this.wvReferenceLines.update(this.series);
    };

    Controller.prototype._listenSeries = function() {
        // Register events
    };

    Controller.prototype._unlistenSeries = function() {
        // Unregister events
    };
})();