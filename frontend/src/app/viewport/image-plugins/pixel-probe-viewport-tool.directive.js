(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvPixelProbeViewportTool', wvPixelProbeViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvPixelProbeViewportTool'] = '?^wvPixelProbeViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvPixelProbeViewportTool($parse, WvBaseTool) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            require: 'wvPixelProbeViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvPixelProbeViewportToolParser = $parse(attrs.wvPixelProbeViewportTool);
            
            // bind attributes -> tool
            scope.$watch(wvPixelProbeViewportToolParser, function(isActivated) {
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
            WvBaseTool.call(this, 'probe', 'probeTouch', true, wvPanViewportTool, wvZoomViewportTool, $scope);
        }
        Controller.prototype = Object.create(WvBaseTool.prototype)
        Controller.prototype.constructor = Controller;
        
        return directive;
    }

})();