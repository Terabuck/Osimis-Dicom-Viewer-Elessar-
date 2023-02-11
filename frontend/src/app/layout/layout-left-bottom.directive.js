(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvLayoutLeftBottom', wvLayoutLeftBottom);

    /* @ngInject */
    function wvLayoutLeftBottom($parse) {
        var directive = {
            bindToController: true,
            controller: LayoutLeftBottomVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            require: '^^wvLayout',
            scope: {
                enabled: '=?wvEnabled'
            },
            transclude: true,
            templateUrl: 'app/layout/layout-left-bottom.directive.html'
        };
        return directive;

        function link(scope, element, attrs, wvLayout) {
            var vm = scope.vm;

            // Enable left bottom by default (as long as the directive is used)
            if ($parse(attrs.enabled).assign) {
                vm.enabled = typeof vm.enabled !== 'undefined' ? !!vm.enabled : true;
            }

            // Transfer states to the wvLayout controller. We delegate state
            // management to wvLayout since this directive may be set up by
            // the wvWebviewer 
            wvLayout.isLeftBottomEnabled = vm.enabled;
            scope.$watch('vm.enabled', function(isEnabled, wasEnabled) {
                wvLayout.isLeftBottomEnabled = !!isEnabled;
            });
        }
    }

    /* @ngInject */
    function LayoutLeftBottomVM() {

    }
})();