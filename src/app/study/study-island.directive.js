/**
 * @ngdoc directive
 * @name webviewer.directive:wvWebviewer
 *
 * @scope
 * @restrict E
 *
 * @param {string} wvStudyId
 * The id of the shown study.
 *
 * @param {boolean} [wvItemSelectionEnabled=false]
 * When this parameter is enabled, the study's items can be selected by the
 * end-user using the left mouse click.
 *
 * @param {boolean} [wvStudyDownloadEnabled=false]
 * Display a button to download the study.
 *
 * @param {boolean} [wvVideoDisplayEnabled=true]
 * Display videos in the serieslist.
 * 
 * @param {string} [wvDisplayMode='grid']
 * Display mode of the items.
 *
 * The value can either be:
 *
 * * `grid` The items are shown in a grid format.
 * * `list` The items are shown in a list format.
 *
 * @param {Array<string>} [wvSelectedSeriesIds=EmptyArray]
 * An array containing the ids of the selected series.
 * 
 * @param {Array<string>} [wvSelectedReportIds=EmptyArray]
 * An array containing the ids of the selected reports.
 * 
 * @param {Array<string>} [wvSelectedVideoIds=EmptyArray]
 * An array containing the ids of the selected videos.
 *
 * @description
 * The `wvStudyIsland` displays a study. It shows all the items contained in
 * that study. Those element can then be dropped in viewports.
 **/
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvStudyIsland', wvStudyIsland);

    /* @ngInject */
    function wvStudyIsland(wvConfig, wvStudyManager) {
        var directive = {
            bindToController: true,
            controller: StudyIslandVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                studyId: '=wvStudyId',
                studyDownloadEnabled: '=?wvStudyDownloadEnabled',
                videoDisplayEnabled: '=?wvVideoDisplayEnabled',
                displayMode: '=?wvDisplayMode',
                showNoReportIcon: '=?wvShowNoReportIcon',

                // Selection-related
                itemSelectionEnabled: '=?wvItemSelectionEnabled',
                selectedSeriesIds: '=?wvSelectedSeriesIds',
                selectedReportIds: '=?wvSelectedReportIds',
                selectedVideoIds: '=?wvSelectedVideoIds'
            },
            templateUrl: 'app/study/study-island.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
            var vm = scope.vm;

            // Default values.
            vm.studyDownloadEnabled = typeof vm.studyDownloadEnabled !== 'undefined' ? vm.studyDownloadEnabled : false;
            vm.videoDisplayEnabled = typeof vm.videoDisplayEnabled !== 'undefined' ? vm.videoDisplayEnabled : true;
            vm.displayMode = typeof vm.displayMode !== 'undefined' ? vm.displayMode : 'grid'; // either `grid` or `list`
            vm.isLoading = true;

            // Selection-related.
            vm.itemSelectionEnabled = typeof vm.itemSelectionEnabled !== 'undefined' ? vm.itemSelectionEnabled : false;
            vm.selectedSeriesIds = vm.selectedSeriesIds || [];
            vm.selectedReportIds = vm.selectedReportIds || [];
            vm.selectedVideoIds = vm.selectedVideoIds || [];

            // Load study informations.
            scope.$watch('vm.studyId', function(newStudyId) {
                // Clean directive if studyId is reset.
                if (!newStudyId) {
                    vm.study = null;
                    return;
                }

                // Adapt study model to new studyId;
                wvStudyManager
                    .get(newStudyId)
                    .then(function(study) {
                        vm.isLoading = false;
                        vm.study = study;
                    });
            });
        }
    }

    /* @ngInject */
    function StudyIslandVM() {

    }
})();