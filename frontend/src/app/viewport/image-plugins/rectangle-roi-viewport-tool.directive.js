(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvRectangleRoiViewportTool', wvRectangleRoiViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvRectangleRoiViewportTool'] = '?^wvRectangleRoiViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvRectangleRoiViewportTool($parse, WvBaseTool) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            require: 'wvRectangleRoiViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvRectangleRoiViewportToolParser = $parse(attrs.wvRectangleRoiViewportTool);
            
            // bind attributes -> tool
            scope.$watch(wvRectangleRoiViewportToolParser, function(isActivated) {
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
            WvBaseTool.call(this, 'rectangleRoi', 'rectangleRoiTouch', true, wvPanViewportTool, wvZoomViewportTool, $scope);
        }
        Controller.prototype = Object.create(WvBaseTool.prototype)
        Controller.prototype.constructor = Controller;
        
        return directive;
    }

})();