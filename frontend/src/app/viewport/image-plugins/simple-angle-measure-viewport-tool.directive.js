(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvSimpleAngleMeasureViewportTool', wvSimpleAngleMeasureViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvSimpleAngleMeasureViewportTool'] = '?^wvSimpleAngleMeasureViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvSimpleAngleMeasureViewportTool($parse, WvBaseTool) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            require: 'wvSimpleAngleMeasureViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvSimpleAngleMeasureViewportToolParser = $parse(attrs.wvSimpleAngleMeasureViewportTool);
            
            // bind attributes -> tool
            scope.$watch(wvSimpleAngleMeasureViewportToolParser, function(isActivated) {
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
            WvBaseTool.call(this, 'simpleAngle', 'simpleAngleTouch', true, wvPanViewportTool, wvZoomViewportTool, $scope);
        }
        Controller.prototype = Object.create(WvBaseTool.prototype)
        Controller.prototype.constructor = Controller;
    
        return directive;
    }

})();