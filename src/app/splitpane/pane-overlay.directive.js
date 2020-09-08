(function() {
    'use strict';
    
    /** <wv-pane-overlay><wv-pane-overlay/>
     *
     * Shows a notice if the overlay can be dropped.
     */
    angular
        .module('webviewer')
        .directive('wvPaneOverlay', wvPaneOverlay);

    /* @ngInject */
    function wvPaneOverlay() {
        var directive = {
            bindToController: true,
            controller: PaneOverlayVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            transclude: true,
            templateUrl: 'app/splitpane/pane-overlay.directive.html',
            scope: {
            }
        };
        return directive;

        function link(scope, element, attrs) {
            var _this = this;
        }
    }

    /* @ngInject */
    function PaneOverlayVM() {
        this.pane = undefined;
    }
})();