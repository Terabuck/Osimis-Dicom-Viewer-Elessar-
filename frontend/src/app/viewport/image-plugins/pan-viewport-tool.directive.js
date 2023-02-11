(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvPanViewportTool', wvPanViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvPanViewportTool'] = '?^wvPanViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvPanViewportTool($parse, WvBaseTool, wvPanViewportTool) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            require: 'wvPanViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvPanViewportToolParser = $parse(attrs.wvPanViewportTool);
            
            // bind attributes -> tool
            scope.$watch(wvPanViewportToolParser, function(isActivated) {
                if (isActivated) {
                    tool.activate();
                }
                else {
                    tool.deactivate();
                }
            });
        }

        /* @ngInject */
        function Controller(wvPanViewportTool, wvZoomViewportTool, $scope) {
            WvBaseTool.call(this, 'pan', 'panTouchDrag', false, wvPanViewportTool, wvZoomViewportTool, $scope);
        }

        Controller.prototype = Object.create(WvBaseTool.prototype)
        Controller.prototype.constructor = Controller;
        
        return directive;
    }

})();