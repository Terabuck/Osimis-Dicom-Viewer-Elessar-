/**
 * @ngdoc directive
 * @name webviewer.directive:wvOverlay
 *
 * @restrict Element
 * @requires webviewer.directive:wvViewport
 *
 *
 */

 (function () {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvOverlay', wvOverlay);

    var ArrayHelpers = {
        pushIfDefined: function (array, value) {
            if (value !== undefined) {
                array.push(value);
            }
        },
        pushIfDefinedWithPrefix: function (array, prefix, value) {
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

            vm.showTopLeftText = function () {
                return wvViewerController.isOverlayTextVisible() && (!!vm.topLeftLines && vm.topLeftLines.length > 0);
            };
            vm.showTopRightText = function () {
                return wvViewerController.isOverlayTextVisible() && (!!vm.topRightLines && vm.topRightLines.length > 0);
            };
            vm.showBottomRightText = function () { // this is a mix of viewport information (check in the html code + custom layout defined in this code)
                return wvViewerController.isOverlayTextVisible() && (!!vm.wvViewport || (!!vm.bottomRightLines && vm.bottomRightLines.length > 0));
            };
            vm.showBottomLeftText = function () {
                return wvViewerController.isOverlayTextVisible() && (!!vm.bottomLeftLines && vm.bottomLeftLines.length > 0);
            };
            vm.showTopLeftIcon = function () {
                return wvViewerController.isOverlayIconsVisible() && !!vm.topLeftIcon;
            }
            vm.showTopRightIcon = function () {
                return wvViewerController.isOverlayIconsVisible() && !!vm.topRightIcon;
            }
            vm.showBottomRightIcon = function () {
                return wvViewerController.isOverlayIconsVisible() && !!vm.bottomRightIcon;
            }
            vm.showBottomLeftIcon = function () {
                return wvViewerController.isOverlayIconsVisible() && !!vm.bottomLeftIcon;
            }

            vm.getTopLeftArea = function (seriesTags, instanceTags) {
                var lines = [];

                var str1 = seriesTags.PatientName;
                window.PatientName = str1.replace(/\^/g, ", ");
                //$index === 0
                lines.push(window.PatientName);

                //$index === 1
                lines.push(seriesTags.PatientID);

                //$index === 2
                lines.push(seriesTags.PatientSex);

                var createdOn = undefined;
                if (seriesTags.SeriesDate !== undefined && seriesTags.SeriesDate.length >= 8) {
                    createdOn = _convertDate(seriesTags.SeriesDate);
                }
                if (createdOn === undefined && seriesTags.StudyDate !== undefined && seriesTags.StudyDate.length >= 8) {
                    createdOn = _convertDate(seriesTags.StudyDate);
                }

                var createdOnYear = createdOn.substring(0, 4);
                var createdOnMonth = createdOn.substring(4, 6);
                var createdOnDay = createdOn.substring(6, 8);

                var date2 = new Date(createdOnYear, createdOnMonth - 1, createdOnDay);

                var patientDob = _convertDate(seriesTags.PatientBirthDate);
                var patientDobYear = patientDob.substring(0, 4);
                var patientDobMonth = patientDob.substring(4, 6);
                var patientDobDay = patientDob.substring(6, 8);

                var formatedDob = undefined;
                formatedDob = patientDobDay + "/" + patientDobMonth + "/" + patientDobYear;
                //$index === 3
                lines.push(formatedDob);

                var date1 = new Date(patientDobYear, patientDobMonth - 1, patientDobDay);

                var diffTime = Math.ceil(date2 - date1);

                var diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
                //$index === 4
                lines.push(diffYears);

                var diffMonths = Math.floor((12 * (diffTime / (1000 * 60 * 60 * 24 * 365)))-(12 * Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365))));
                //$index === 5
                lines.push(diffMonths + "");
                //$index === 6
                lines.push(", " + diffMonths);

                var diffDays = Math.floor((diffTime / (1000 * 60 * 60 * 24)));
                //$index === 7
                lines.push(diffDays);

                var diffHours = Math.floor((diffTime / (1000 * 60 * 60)));
                //$index === 8
                lines.push(diffHours);

                //$index === 9
                if (diffDays > 7300) {
                    lines.push('Age9');
                } else if (diffDays > 791) {
                    lines.push('Age8');
                } else if (diffDays > 761) {
                    lines.push('Age7');
                } else if (diffDays > 730) {
                    lines.push('Age6');
                } else if (diffDays > 426) {
                    lines.push('Age5');
                } else if (diffDays > 396) {
                    lines.push('Age4');
                } else if (diffDays > 365) {
                    lines.push('Age3');
                } else if (diffDays > 61) {
                    lines.push('Age2');
                } else if (diffDays > 31) {
                    lines.push('Age1');
                } else if (diffDays > 2) {
                    lines.push('Age0');
                } else {
                    lines.push('Newborn');
                }

               return lines;
            };

            vm.getTopRightArea = function (seriesTags, instanceTags) {
                var lines = [];

                window.StudyDescription = seriesTags.StudyDescription;

                ArrayHelpers.pushIfDefined(lines, window.StudyDescription);


                var createdOn = undefined;

                if (seriesTags.SeriesDate !== undefined && seriesTags.SeriesDate.length >= 8) {
                    createdOn = _convertDate(seriesTags.SeriesDate);
                    if (seriesTags.SeriesTime != undefined) {
                        createdOn = createdOn + " - " + seriesTags.SeriesTime.substr(0, 2) + ":" + seriesTags.SeriesTime.substr(2, 2);
                        if (seriesTags.SeriesTime.length >= 6) {
                            createdOn = createdOn + ":" + seriesTags.SeriesTime.substr(4, 2);
                        }
                    }
                }

                if (createdOn === undefined && seriesTags.StudyDate !== undefined && seriesTags.StudyDate.length >= 8) {
                    createdOn = _convertDate(seriesTags.StudyDate);
                    if (seriesTags.StudyTime != undefined) {
                        createdOn = createdOn + " - " + seriesTags.StudyTime.substr(0, 2) + ":" + seriesTags.StudyTime.substr(2, 2);
                        if (seriesTags.StudyTime.length >= 6) {
                            createdOn = createdOn + ":" + seriesTags.StudyTime.substr(4, 2);
                        }
                    }
                }

                var formattedCreationDate = undefined;
                formattedCreationDate = createdOn.substring(6, 8) + "/" + createdOn.substring(4, 6) + "/" + createdOn.substring(0, 4);
                ArrayHelpers.pushIfDefined(lines, formattedCreationDate);
                ArrayHelpers.pushIfDefined(lines, instanceTags.BodyPartExamined);
                ArrayHelpers.pushIfDefined(lines, seriesTags.BodyPartExamined);
                //this is working with backend/WebViewerLibrary/Instance/InstanceRepository.cpp - Ludwig
                ArrayHelpers.pushIfDefined(lines, instanceTags.PatientComments);
                ArrayHelpers.pushIfDefined(lines, seriesTags.OsimisNote);

                return lines;
            };
            vm.getBottomLeftArea = function (seriesTags, instanceTags) { // this has been added for Avignon, it still needs to be checked with nico how it should be done for good
                var lines = [];

                var lineElements = [];
                ArrayHelpers.pushIfDefinedWithPrefix(lineElements, "#", seriesTags.SeriesNumber);
                ArrayHelpers.pushIfDefined(lineElements, seriesTags.SeriesDescription);
                if (lineElements.length > 0) {
                    lines.push(lineElements.join(" - "));
                }

                if (instanceTags.InstanceNumber !== undefined) {
                    lines.push("Img #: " + instanceTags.InstanceNumber);
                }

                var imgLabel = undefined;

                if (instanceTags.ImageLaterality !== undefined && instanceTags.ViewPosition !== undefined) {

                    imgLabel = instanceTags.ImageLaterality + " - " + instanceTags.ViewPosition;

                    ArrayHelpers.pushIfDefined(lines, imgLabel);

                }

                return lines;

            };
            vm.getBottomRightArea = function (seriesTags, instanceTags) {
                return [];
            };
            vm.updateIcons = function (overlayIconsInfo) {
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
            vm.updateLayout = function (seriesTags, imageId, customOverlayInfo) {
                if (imageId) {
                    wvInstanceManager
                        .getInfos(imageId.split(":")[0]) // imageId is something like orthancId:frameId
                        .then(function (instanceInfos) {
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
                var series = ctrls.series.getSeriesPromise().then(function (series) {
                    vm.wvSeries = series;
                    vm.updateLayout(vm.wvSeries.tags, vm.wvSeries.imageIds[vm.wvSeries.currentShownIndex], vm.wvSeries.customOverlayInfo);

                    ctrls.series.onSeriesChanged(_this, function (series) {
                        vm.wvSeries = series;
                        vm.updateLayout(vm.wvSeries.tags, vm.wvSeries.imageIds[vm.wvSeries.currentShownIndex], vm.wvSeries.customOverlayInfo);
                    });
                    ctrls.series.onCurrentImageIdChanged(_this, function (imageId, notUsed) {
                        vm.updateLayout(vm.wvSeries.tags, imageId, vm.wvSeries.customOverlayInfo);
                    });

                    scope.$on('$destroy', function () {
                        ctrls.series.onSeriesChanged.close(_this);
                        ctrls.series.onCurrentImageIdChanged.close(_this);
                    });
                });
            }

            // Update study model.
            vm.study = undefined;
            scope.$watch('vm.studyId', function (studyId) {
                // Clear study if studyId is removed.
                if (!studyId) {
                    vm.study = undefined;
                    return;
                }

                // Load new study.
                wvStudyManager
                    .get(studyId)
                    .then(function (study) {
                        vm.study = study;
                    });
            });

        }
    }

    /* @ngInject */
    function Controller() {

    }
})();