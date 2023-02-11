/**
 * @description
 * Directive to be transcluded in the layout. It provides configuration
 * attribute that are transmitted to the `wvLayout` directive. The `wvLayout`
 * directive has the responsibility of setting the right css classes.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvLayoutTopLeft', wvLayoutTopLeft);

    /* @ngInject */
    function wvLayoutTopLeft($parse) {
        var directive = {
            bindToController: true,
            controller: LayouTopLeftVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            require: '^^wvLayout',
            scope: {
                enabled: '=?wvEnabled'
            },
            transclude: true,
            template: '<div ng-transclude></div>'
        };
        return directive;

        function link(scope, element, attrs, wvLayout) {
            var vm = scope.vm;

            // Enable top left by default (as long as the directive is used)
            if ($parse(attrs.enabled).assign) {
                vm.enabled = typeof vm.enabled !== 'undefined' ? vm.enabled : true;
            }

            // Transfer states to the wvLayout controller. We delegate state
            // management to wvLayout since this directive may be set up by
            // the wvWebviewer 
            wvLayout.isTopLeftEnabled = vm.enabled;
            scope.$watch('vm.enabled', function(isEnabled, wasEnabled) {
                wvLayout.isTopLeftEnabled = isEnabled;
            });
        }
    }

    /* @ngInject */
    function LayouTopLeftVM() {

    }
})();