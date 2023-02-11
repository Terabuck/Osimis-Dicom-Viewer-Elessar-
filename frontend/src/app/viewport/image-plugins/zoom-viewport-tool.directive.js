(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvZoomViewportTool', wvZoomViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvZoomViewportTool'] = '?^wvZoomViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvZoomViewportTool($parse, WvBaseTool) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            require: 'wvZoomViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvZoomViewportToolParser = $parse(attrs.wvZoomViewportTool);
            
            // bind attributes -> tool
            scope.$watch(wvZoomViewportToolParser, function(isActivated) {
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
            WvBaseTool.call(this, 'zoom', 'zoomTouchDrag', false, wvPanViewportTool, wvZoomViewportTool, $scope); //'zoomTouchPinch'); // this somehow enables the zoom tool of cornerstone
        }
        Controller.prototype = Object.create(WvBaseTool.prototype)
        Controller.prototype.constructor = Controller;
        
        Controller.prototype._listenViewChange = function(viewport) {
            var _this = this;
            var enabledElement = viewport.getEnabledElement();

            // For some reason, glitches happens on some images when the image 
            // is zoomed in/out. We redraw the image a second time everytime 
            // the zooming action finishes so glitches are cleaned.
            $(enabledElement).on('mouseup.'+this.toolName, function() {
                setTimeout(function() {
                    viewport.draw(false);
                });
            });
        };

        Controller.prototype._unlistenViewChange = function(viewport) {
            var enabledElement = viewport.getEnabledElement();

            $(enabledElement).off('mouseup.'+this.toolName);
        };

        return directive;
    }

})();