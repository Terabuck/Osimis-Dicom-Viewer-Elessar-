/**
 * @ngdoc directive
 * @name webviewer.directive:wvStudyDownloadButton
 * 
 * @param {wvStudyId} wvStudyId
 * The id of the study to be downloaded. If it is undefined, the button is
 * hidden.
 *
 * @scope
 * @restrict Element
 * 
 * @description
 * The `wvStudyDownloadButton` directive displays a download button. When the
 * user clicks on this study, the study is downloaded.
 **/
 (function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvStudyDownloadButton', wvStudyDownloadButton);

    /* @ngInject */
    function wvStudyDownloadButton(wvConfig) {
        var directive = {
            bindToController: true,
            controller: StudyDownloadButtonVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            templateUrl: 'app/study/study-download-button.directive.html',
            scope: {
                studyId: '=wvStudyId'
            }
        };
        return directive;

        function link(scope, element, attrs) {
            var vm = scope.vm;

            scope.$watch('vm.studyId', function(studyId) {
                if (wvConfig.downloadHandler !== undefined)
                {
                    vm.downloadLink = undefined;
                } else {
                    if (!studyId) {
                        vm.downloadLink = '#';
                    }
                    else {
                        vm.downloadLink = wvConfig.orthancApiURL + '/studies/' + studyId + '/archive';
                    }
                }
            });
        }
    }

    /* @ngInject */
    function StudyDownloadButtonVM($window, wvConfig, wvStudyManager) {
        this.window = $window;
        this.wvConfig = wvConfig;
        var vm = this;

        //wvConfig.downloadHandler = function(studyOrthancId, studyInstanceUid) {console.log("will download ", studyOrthancId, studyInstanceUid);}

        this.clicked = function(event) {

            if (wvConfig.downloadHandler !== undefined)
            {
                event.preventDefault();
                wvStudyManager.get(vm.studyId).then(function(study) {
                    wvConfig.downloadHandler(vm.studyId, study.tags["StudyInstanceUID"]);
                });
            }
        }
    }
})();