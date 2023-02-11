(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvArrowAnnotateViewportTool', wvArrowAnnotateViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvArrowAnnotateViewportTool'] = '?^wvArrowAnnotateViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvArrowAnnotateViewportTool($parse, WvBaseTool) {
        var directive = {
            require: 'wvArrowAnnotateViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvArrowAnnotateViewportToolParser = $parse(attrs.wvArrowAnnotateViewportTool);

            // var config = {
            //     getTextCallback : getTextCallback,
            //     changeTextCallback : changeTextCallback,
            //     drawHandles : false,
            //     drawHandlesOnHover : true,
            //     arrowFirst : true
            // }

            // // Try commenting this out to see the default behaviour
            // // By default, the tool uses Javascript's Prompt function
            // // to ask the user for the annotation. This example uses a
            // // slightly nicer HTML5 dialog element.
            // cornerstoneTools.arrowAnnotate.setConfiguration(config);
            
            // bind attributes -> tool
            scope.$watch(wvArrowAnnotateViewportToolParser, function(isActivated) {
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
            WvBaseTool.call(this, 'arrowAnnotate', 'arrowAnnotateTouch', true, wvPanViewportTool, wvZoomViewportTool, $scope);
        }
        Controller.prototype = Object.create(WvBaseTool.prototype)
        Controller.prototype.constructor = Controller;
        
        return directive;
    }

})();