(function (osimis) {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvStudyInformationBreadcrumb', wvStudyInformationBreadcrumb);

    /* @ngInject */
    function wvStudyInformationBreadcrumb() {
        var directive = {
            bindToController: true,
            controller: StudyInformationBreadcrumbVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                studyId: '=wvStudyId'
            },
            templateUrl: 'app/study/study-information-breadcrumb.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
        }
    }

    /* @ngInject */
    function StudyInformationBreadcrumbVM($scope, $http, wvConfig) {
        var vm = this;

        vm.studyTags = {};
        vm.patientTags = {};
        
        // @todo use outer model layer

        // load study informations
        $scope.$watch('vm.studyId', function(newStudyId) {
            if (!newStudyId) return; // @todo hide directive

            var request = new osimis.HttpRequest();
            request.setHeaders(wvConfig.httpRequestHeaders);
            request.setCache(true);

            request
                .get(wvConfig.orthancApiURL + '/studies/'+newStudyId)
                .then(function(response) {
                    var study = response.data;
                    vm.studyTags = study.MainDicomTags;
                    vm.patientTags = study.PatientMainDicomTags;

                    // format datas
                    function _convertDate(date) {
                        return date.replace(/^([0-9]{4})([0-9]{2})([0-9]{2})$/, '$1/$2/$3');
                    }
                    vm.studyTags.StudyDate = vm.studyTags.StudyDate && _convertDate(vm.studyTags.StudyDate);
                    vm.patientTags.PatientBirthDate = vm.patientTags.PatientBirthDate && _convertDate(vm.patientTags.PatientBirthDate);
                });
        });
    }

})(this.osimis || (this.osimis = {}));

