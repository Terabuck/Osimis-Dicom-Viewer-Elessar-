(function () {
    'use strict';

    angular
        .module('webviewer.layout')
        .directive('wvLayoutRight', wvLayoutRight);

    /* @ngInject */
    function wvLayoutRight($parse) {
        var directive = {
            bindToController: true,
            controller: layoutRightCtrl,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            require: '^^wvLayout',
            transclude: true,
            scope: {
                enabled: '=?wvEnabled',
                closed: '=?wvClosed',
                handlesEnabled: '=?wvHandlesEnabled'
            },
            templateUrl:'app/layout/layout-right.html'
        };
        return directive;

        function link(scope, element, attrs, wvLayout) {
            var vm = scope.vm;

            // Enable top right by default (as long as the directive is used)
            if ($parse(attrs.enabled).assign) {
                vm.enabled = typeof vm.enabled !== 'undefined' ? !!vm.enabled : true;
            }
            // Keep top right open by default
            if ($parse(attrs.closed).assign) {
                vm.closed = typeof vm.closed !== 'undefined' ? !!vm.closed : false;
            }
            // Enable handles by default
            if ($parse(attrs.handlesEnabled).assign) {
                vm.handlesEnabled = typeof vm.handlesEnabled !== 'undefined' ? !!vm.handlesEnabled : true;
            }

            // Transfer states to the wvLayout controller. We delegate state
            // management to wvLayout since this directive may be set up by
            // the wvWebviewer 
            wvLayout.isRightEnabled = vm.enabled;
            wvLayout.isRightClosed = vm.closed;
            scope.$watchGroup([
                'vm.enabled',
                'vm.closed'
            ], function(newValues) {
                wvLayout.isRightEnabled = !!newValues[0];
                wvLayout.isRightClosed = !!newValues[1];
            });

            // Sync right section position with other sections
            vm.isTopPaddingEnabled = wvLayout.isTopEnabled;
            vm.isBottomPaddingEnabled = wvLayout.isBottomEnabled;
            
            scope.$watch(function() {
                return [
                    wvLayout.isTopEnabled,
                    wvLayout.isBottomEnabled
                ];
            }, function(newValues) {
                vm.isTopPaddingEnabled = newValues[0];
                vm.isBottomPaddingEnabled = newValues[1];
            }, true);
        }
    }

    /* @ngInject */
    function layoutRightCtrl($window) {
        this.window = $window;
    }

})();

