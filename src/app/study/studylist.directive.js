/**
 * @ngdoc directive
 * @name webviewer.directive:wvStudylist
 *
 * @restrict Element
 *
 * @param {Array<string>} wvPickableStudyIds
 * The list of available study ids.
 *
 * @param {boolean} [readonly=false]
 * Disable edition of the study picker data. Useful for technology such as
 * liveshare.
 */
(function() {
    'use strict';

    angular.module('webviewer')
    .directive('wvStudylist', function ($rootScope, $timeout, $translate,  wvStudyManager) {
        return {
            scope: {
                pickableStudyIds: '=wvPickableStudyIds',
                pickableStudyIdLabels: '=?wvPickableStudyIdLabels',
                selectedStudyIds: '=?wvSelectedStudyIds',
                readonly: '=?wvReadonly'
            },
            templateUrl: 'app/study/studylist.directive.html',
            restrict: 'E',
            link: function postLink(scope, element, attrs) {
                scope.studies = [];

                // Default values
                scope.pickableStudyIdLabels = typeof scope.pickableStudyIdLabels !== 'undefined' ? scope.pickableStudyIdLabels : {};
                scope.pickableStudyIds = typeof scope.pickableStudyIds !== 'undefined' ? scope.pickableStudyIds : [];
                scope.selectedStudyIds = typeof scope.selectedStudyIds !== 'undefined' ? scope.selectedStudyIds : [];
                scope.readonly = typeof scope.readonly !== 'undefined' ? scope.readonly : false;

                // sortedSelectedStudyIds <-> [chronological] selectedStudyIds.
                scope.sortedSelectedStudyIds = [];
                // Case 1: Chronological array changes (an actor external to
                // the directive changes the value via the directive's
                // attribute).
                // -> Just replace the sorted array (as both structure will
                //    work fine with the `bs-select` directive).
                scope.$watchCollection('selectedStudyIds', function(newChronological, oldChronological) {
                    scope.sortedSelectedStudyIds = newChronological;
                });

                // Case 2:
                // Sorted array changes (the angularstrap `bs-select` directive
                // changes the content of the array).
                // -> Convert the sorted array to a chronological one (required
                //    to display serieslists in chronological order, especially
                //    to preserve the studies colors when a new study is
                //    added).
                scope.$watchCollection('sortedSelectedStudyIds', function(newSorted, oldSorted) {
                    // Remove old values.
                    scope.selectedStudyIds = _.intersection(
                        scope.selectedStudyIds,
                        newSorted
                    );

                    // Add new values, at the end of the array though.
                    scope.selectedStudyIds = _.concat(
                        scope.selectedStudyIds,
                        _.difference(newSorted, scope.selectedStudyIds)
                    );
                });

                // Update shown studies' information based on pickable study
                // ids.
                scope.$watchCollection('pickableStudyIds', function(studyIds) {
                    console.log('pickable study id labels', scope.pickableStudyIdLabels, studyIds);
                    scope.studies = studyIds.map(function(studyId) {
                        return {
                            label: scope.pickableStudyIdLabels[studyId] || "?",
                            value: studyId
                        };
                    });

                    // Load study label.
                    // @todo Move this inside a study model
                    scope.studies.forEach(function(v) {
                        var studyId = v.value;

                        if(v.label === "?"){
                            wvStudyManager
                                .get(studyId)
                                .then(function(study) {
                                    v.label  = study.tags.StudyDescription || 'Untitled study';
                                    if (study.tags.StudyDate) {
                                        v.label += ' [' + study.tags.StudyDate + ']';
                                    }
                                });
                        }


                    });
                });

                // translation currently disabled -> to be reworked when we want something else than "..." as a placeholder
                // // because bs-select (used in the UI) does not support dynamic value interpolation (it only take the first values met)
                // // We need to set a boolean to make the Ui waiting that the language has been loaded.
                // // Each time the language changed, the select directive if destroyed and rebuild once the
                // // $translateLoadingEnd is triggered
                // function setTranslated() {
                //     var removeListener = $rootScope.$on('$translateLoadingEnd', function () {
                //         scope.translateReady = true;
                //         removeListener();
                //         removeListener = null;
                //     });
                // }
                // $rootScope.$on('$translateLoadingStart', function(){
                //     scope.translateReady = false;
                //     setTranslated()
                // });

                // if($translate.isReady()){
                //     scope.translateReady = true;
                // }else{
                //     scope.translateReady = false;
                //     setTranslated();
                // }

                // $rootScope.$on('$translateChangeSuccess', function(){
                //     scope.translateReady = true;
                // });
            }
        };
    });
})();
