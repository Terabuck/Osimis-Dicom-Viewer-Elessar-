(function () {
    'use strict';

    angular
        .module('webviewer.layout')
        .directive('wvLayoutTop', wvLayoutTop);

    /* @ngInject */
    function wvLayoutTop($parse) {
        var directive = {
            bindToController: true,
            require: '^^wvLayout',
            transclude: {
                '1': '?wvLayoutTop1',
                '2': '?wvLayoutTop2',
                '3': '?wvLayoutTop3',
                '4': '?wvLayoutTop4'
            },
            controller: layoutTopCtrl,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                enabled: '=?wvEnabled'
            },
            templateUrl: 'app/layout/layout-top.html'
        };
        return directive;

        function link(scope, element, attrs, wvLayout) {
            var vm = scope.vm;

            // Enable top by default (as long as the directive is used)
            if ($parse(attrs.enabled).assign) {
                vm.enabled = typeof vm.enabled !== 'undefined' ? vm.enabled : true;
            }

            // Transfer states to the wvLayout controller. We delegate state
            // management to wvLayout since this directive may be set up by
            // the wvWebviewer 
            wvLayout.isTopEnabled = vm.enabled;
            scope.$watch('vm.enabled', function(isEnabled, wasEnabled) {
                wvLayout.isTopEnabled = isEnabled;
            });
        }
    }

    /* @ngInject */
    function layoutTopCtrl() {
        var vm = this;
    }

})();

