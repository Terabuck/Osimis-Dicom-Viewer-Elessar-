(function () {
    'use strict';

    angular
        .module('webviewer.layout')
        .directive('wvLayoutBottom', wvLayoutBottom);

    /* @ngInject */
    function wvLayoutBottom() {
        var directive = {
            bindToController: true,
            require: '^^wvLayout',
            transclude: true,
            controller: layoutBottomVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                enabled: '=?wvEnabled'
            },
            templateUrl: 'app/layout/layout-bottom.html'
        };
        return directive;

        function link(scope, element, attrs, wvLayout) {
            var vm = scope.vm;

            // Disable bottom by default
            vm.enabled = typeof vm.enabled !== 'undefined' ? vm.enabled : false;

            // Transfer states to the wvLayout controller. We delegate state
            // management to wvLayout since this directive may be set up by
            // the wvWebviewer 
            wvLayout.isBottomEnabled = vm.enabled;
            scope.$watch('vm.enabled', function(isEnabled, wasEnabled) {
                wvLayout.isBottomEnabled = isEnabled;
            });
        }
    }

    /* @ngInject */
    function layoutBottomVM() {
        var vm = this;
    }

})();

