(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvLengthMeasureViewportTool', wvLengthMeasureViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvLengthMeasureViewportTool'] = '?^wvLengthMeasureViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvLengthMeasureViewportTool($parse, WvBaseTool) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            require: 'wvLengthMeasureViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvLengthMeasureViewportToolParser = $parse(attrs.wvLengthMeasureViewportTool);
            
            // bind attributes -> tool
            scope.$watch(wvLengthMeasureViewportToolParser, function(isActivated) {
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
            WvBaseTool.call(this, 'length', 'lengthTouch', true, wvPanViewportTool, wvZoomViewportTool, $scope);
        }
        Controller.prototype = Object.create(WvBaseTool.prototype)
        Controller.prototype.constructor = Controller;
        
        return directive;
    }

})();