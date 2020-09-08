(function () {
    'use strict';

    angular
        .module('webviewer.layout')
        .directive('wvLayoutLeft', wvLayoutLeft);

    /* @ngInject */
    function wvLayoutLeft($parse) {
        var directive = {
            bindToController: true,
            controller: layoutLeftCtrl,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            require: '^^wvLayout',
            transclude: {
                '1': '?wvLayoutLeft1',
                '2': '?wvLayoutLeft2',
                '3': '?wvLayoutLeft3'
            },
            scope: {
                enabled: '=?wvEnabled',
                closed: '=?wvClosed',
                handlesEnabled: '=?wvHandlesEnabled',
                isSmall: "=?wvIsSmall"
            },
            templateUrl:'app/layout/layout-left.html'
        };
        return directive;

        function link(scope, element, attrs, wvLayout) {
            var vm = scope.vm;

            // Enable top left by default (as long as the directive is used)
            if ($parse(attrs.enabled).assign) {
                vm.enabled = typeof vm.enabled !== 'undefined' ? !!vm.enabled : true;
            }
            // Keep top left open by default
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
            wvLayout.isLeftEnabled = vm.enabled;
            wvLayout.isLeftClosed = vm.closed;
            scope.$watchGroup([
                'vm.enabled',
                'vm.closed',
                'vm.isSmall'
            ], function(newValues) {
                wvLayout.isLeftEnabled = !!newValues[0];
                wvLayout.isLeftClosed = !!newValues[1];
                wvLayout.isLeftSmall = !!newValues[2];
            });

            // Sync left section position with other sections
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
    function layoutLeftCtrl($window) {
        this.window = $window;

    }

})();

