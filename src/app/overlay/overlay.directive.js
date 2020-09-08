/**
 * @ngdoc directive
 * @name webviewer.directive:wvOverlay
 *
 * @restrict Element
 * @requires webviewer.directive:wvViewport
 *
 *
 */

(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvOverlay', wvOverlay);

    var ArrayHelpers = {
       pushIfDefined: function(array, value) {
            if (value !== undefined) {
                array.push(value);
            }
       },
       pushIfDefinedWithPrefix: function(array, prefix, value) {
            if (value !== undefined) {
                array.push(prefix + value);
            }
        }
     };

    /* @ngInject */
    function wvOverlay(wvStudyManager, wvInstanceManager, wvViewerController) {
        var directive = {
            bindToController: true,
            controller: Controller,
            controllerAs: 'vm',
            replace: true, // avoid overlay capturing viewport events
            link: link,
            restrict: 'E',
            transclude: true,
            require: {
                series: '?^^vpSeriesId'
            },
            templateUrl: 'app/overlay/overlay.directive.html',
            scope: {
                wvTags: '=?',
                wvSeries: '=?',
                studyId: '=?wvStudyId',
                wvViewport: '=?',
                image: '=wvImage',
            }
        };
        return directive;

        function link(scope, element, attrs, ctrls) {
            var _this = this;
            var vm = scope.vm;

            vm.showTopLeftText = function() {
                return wvViewerController.isOverlayTextVisible() && (!!vm.topLeftLines && vm.topLeftLines.length > 0);
            };
            vm.showTopRightText = function() {
                return wvViewerController.isOverlayTextVisible() && (!!vm.topRightLines && vm.topRightLines.length > 0);
            };
            vm.showBottomRightText = function() { // this is a mix of viewport information (check in the html code + custom layout defined in this code)
                return wvViewerController.isOverlayTextVisible() && (!!vm.wvViewport || (!!vm.bottomRightLines && vm.bottomRightLines.length > 0));
            };
            vm.showBottomLeftText = function() {
                return wvViewerController.isOverlayTextVisible() && (!!vm.bottomLeftLines && vm.bottomLeftLines.length > 0);
            };
            vm.showTopLeftIcon = function() {
                return wvViewerController.isOverlayIconsVisible() && !!vm.topLeftIcon;
            }
            vm.showTopRightIcon = function() {
                return wvViewerController.isOverlayIconsVisible() && !!vm.topRightIcon;
            }
            vm.showBottomRightIcon = function() {
                return wvViewerController.isOverlayIconsVisible() && !!vm.bottomRightIcon;
            }
            vm.showBottomLeftIcon = function() {
                return wvViewerController.isOverlayIconsVisible() && !!vm.bottomLeftIcon;
            }


            vm.getTopLeftArea = function(seriesTags, instanceTags) {
                var lines = [];

                ArrayHelpers.pushIfDefined(lines, seriesTags.PatientName);
                ArrayHelpers.pushIfDefined(lines, seriesTags.PatientID);

                var dobAndSex = _convertDate(seriesTags.PatientBirthDate);
                if (seriesTags.PatientSex !== undefined && seriesTags.PatientSex.length > 0) {
                    if (dobAndSex === undefined) {
                        dobAndSex = seriesTags.PatientSex;
                    } else {
                        dobAndSex = dobAndSex + " - " + seriesTags.PatientSex;
                    }
                }

                ArrayHelpers.pushIfDefined(lines, dobAndSex);
                ArrayHelpers.pushIfDefined(lines, seriesTags.OsimisNote);

                return lines;
            };
            vm.getTopRightArea = function(seriesTags, instanceTags) {
                var lines = [];

                ArrayHelpers.pushIfDefined(lines, seriesTags.StudyDescription);
                var dateAndTime = undefined;
                if (seriesTags.SeriesDate !== undefined && seriesTags.SeriesDate.length >= 8) {
                    dateAndTime = _convertDate(seriesTags.SeriesDate);
                    if (seriesTags.SeriesTime != undefined) {
                        dateAndTime = dateAndTime + " - " + seriesTags.SeriesTime.substr(0, 2) + ":" + seriesTags.SeriesTime.substr(2, 2);
                        if (seriesTags.SeriesTime.length >= 6) {
                            dateAndTime = dateAndTime + ":" + seriesTags.SeriesTime.substr(4, 2);
                        }
                    }
                }
                if (dateAndTime === undefined && seriesTags.StudyDate !== undefined && seriesTags.StudyDate.length >= 8) {
                    dateAndTime = _convertDate(seriesTags.StudyDate);
                    if (seriesTags.StudyTime != undefined) {
                        dateAndTime = dateAndTime + " - " + seriesTags.StudyTime.substr(0, 2) + ":" + seriesTags.StudyTime.substr(2, 2);
                        if (seriesTags.StudyTime.length >= 6) {
                            dateAndTime = dateAndTime + ":" + seriesTags.StudyTime.substr(4, 2);
                        }
                    }
                }
                ArrayHelpers.pushIfDefined(lines, dateAndTime);

                var lineElements = [];
                ArrayHelpers.pushIfDefinedWithPrefix(lineElements, "#", seriesTags.SeriesNumber);
                ArrayHelpers.pushIfDefined(lineElements, seriesTags.SeriesDescription);
                if (lineElements.length > 0) {
                    lines.push(lineElements.join(" - "));
                }

                return lines;
            };
            vm.getBottomLeftArea = function(seriesTags, instanceTags) { // this has been added for Avignon, it still needs to be checked with nico how it should be done for good
                var lines = [];

                if (instanceTags.InstanceNumber !== undefined)
                {
                    lines.push("Image Number: " + instanceTags.InstanceNumber);
                }
                ArrayHelpers.pushIfDefined(lines, instanceTags.PatientOrientation);
                ArrayHelpers.pushIfDefined(lines, instanceTags.ImageLaterality);
                ArrayHelpers.pushIfDefined(lines, instanceTags.ViewPosition);

                return lines;
            };
            vm.getBottomRightArea = function(seriesTags, instanceTags) {
                return [];
            };
            vm.updateIcons = function(overlayIconsInfo) {
                if (overlayIconsInfo === undefined) {
                    vm.topLeftIcon = undefined;
                    vm.bottomLeftIcon = undefined;
                    vm.topRightIcon = undefined;
                    vm.bottomRightIcon = undefined;
                } else {
                    vm.topLeftIcon = overlayIconsInfo.topLeftIcon;
                    vm.bottomLeftIcon = overlayIconsInfo.bottomLeftIcon;
                    vm.topRightIcon = overlayIconsInfo.topRightIcon;
                    vm.bottomRightIcon = overlayIconsInfo.bottomRightIcon;
                }
            };
            vm.updateLayout = function(seriesTags, imageId, customOverlayInfo) {
                if (imageId) {
                    wvInstanceManager
                        .getInfos(imageId.split(":")[0]) // imageId is something like orthancId:frameId
                        .then(function(instanceInfos) {
                            var instanceTags = instanceInfos.TagsSubset;
                            vm.topLeftLines = vm.getTopLeftArea(seriesTags, instanceTags);
                            vm.topRightLines = vm.getTopRightArea(seriesTags, instanceTags);
                            vm.bottomLeftLines = vm.getBottomLeftArea(seriesTags, instanceTags);
                            vm.bottomRightLines = vm.getBottomRightArea(seriesTags, instanceTags);
                            vm.showOverlay = true;
                            if (customOverlayInfo !== undefined) {
                                vm.updateIcons(customOverlayInfo.icons);
                            } else {
                                vm.updateIcons(undefined);
                            }
                        });
                } else {
                    vm.topLeftLines = [];
                    vm.topRightLines = [];
                    vm.bottomLeftLines = [];
                    vm.bottomRightLines = [];
                    vm.showOverlay = false;
                    vm.updateIcons(undefined);
                }
            };

            // auto grab series model
            if (ctrls.series) {
                var series = ctrls.series.getSeriesPromise().then(function(series) {
                    vm.wvSeries = series;
                    vm.updateLayout(vm.wvSeries.tags, vm.wvSeries.imageIds[vm.wvSeries.currentShownIndex], vm.wvSeries.customOverlayInfo);

                    ctrls.series.onSeriesChanged(_this, function(series) {
                        vm.wvSeries = series;
                        vm.updateLayout(vm.wvSeries.tags, vm.wvSeries.imageIds[vm.wvSeries.currentShownIndex], vm.wvSeries.customOverlayInfo);
                    });
                    ctrls.series.onCurrentImageIdChanged(_this, function(imageId, notUsed) {
                        vm.updateLayout(vm.wvSeries.tags, imageId, vm.wvSeries.customOverlayInfo);
                    });

                    scope.$on('$destroy', function() {
                        ctrls.series.onSeriesChanged.close(_this);
                        ctrls.series.onCurrentImageIdChanged.close(_this);
                    });
                });
            }

            // Update study model.
            vm.study = undefined;
            scope.$watch('vm.studyId', function(studyId) {
                // Clear study if studyId is removed.
                if (!studyId) {
                    vm.study = undefined;
                    return;
                }

                // Load new study.
                wvStudyManager
                    .get(studyId)
                    .then(function(study) {
                        vm.study = study;
                    });
            });

        }
    }

    /* @ngInject */
    function Controller() {

    }
})();
