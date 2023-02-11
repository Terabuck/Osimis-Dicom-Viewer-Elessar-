(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvEllipticalRoiViewportTool', wvEllipticalRoiViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvEllipticalRoiViewportTool'] = '?^wvEllipticalRoiViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvEllipticalRoiViewportTool($parse, WvBaseTool) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            require: 'wvEllipticalRoiViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvEllipticalRoiViewportToolParser = $parse(attrs.wvEllipticalRoiViewportTool);
            
            // bind attributes -> tool
            scope.$watch(wvEllipticalRoiViewportToolParser, function(isActivated) {
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
            WvBaseTool.call(this, 'ellipticalRoi', 'ellipticalRoiTouch', true, wvPanViewportTool, wvZoomViewportTool, $scope);
        }
        Controller.prototype = Object.create(WvBaseTool.prototype)
        Controller.prototype.constructor = Controller;
    
        return directive;
    }

})();