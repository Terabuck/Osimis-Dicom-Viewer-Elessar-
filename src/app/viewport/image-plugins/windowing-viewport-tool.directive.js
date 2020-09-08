(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvWindowingViewportTool', wvWindowingViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvWindowingViewportTool'] = '?^wvWindowingViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvWindowingViewportTool($, $parse, WvBaseTool, wvConfig) {
        var directive = {
        	require: 'wvWindowingViewportTool',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvDefaultViewportToolParser = $parse(attrs.wvWindowingViewportTool);

            // bind attributes -> tool
            scope.$watch(wvDefaultViewportToolParser, function(isActivated) {
                if (isActivated) {
                    tool.activate();
                }
                else {
                    tool.deactivate();
                }
            });
        }

        /* @ngInject */
        function Controller($scope, wvPanViewportTool, wvZoomViewportTool, wvWindowingViewportTool) {
            WvBaseTool.call(this, 'default', undefined, false, wvPanViewportTool, wvZoomViewportTool, $scope);

            this._activateInputs = function(viewport) {
                var _this = this;
                var $enabledElement = $(viewport.getEnabledElement());

                $enabledElement.on('touchstart.windowingTool mousedown.windowingTool', function(e) {
                    var isTouchEvent = !e.pageX && !e.pageY && !!e.originalEvent.touches;
                    var mouseButton = !isTouchEvent ? e.which : 1;
                    var startX = !isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX;
                    var startY = !isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY;
                    var lastX = startX;
                    var lastY = startY;

                    $(document).one('touchstart mouseup', function(e) {
                        $(document).unbind('touchmove.windowingTool mousemove.windowingTool');
                    });

                    $(document).on('touchmove.windowingTool mousemove.windowingTool', function(e) {
                        // Prevent issues on touchscreens.
                        e.preventDefault();

                        $scope.$apply(function() {  // @todo necessary ?
                            var deltaX = (!isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX) - lastX;
                            var deltaY = (!isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY) - lastY;
                            var deltaFromStartX = (!isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX) - startX;
                            var deltaFromStartY = (!isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY) - startY;
                            lastX = !isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX;
                            lastY = !isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY;

                            if (mouseButton === 1) { // left-click + move
                                wvWindowingViewportTool.applyWindowingToViewport(viewport, deltaX, deltaY, deltaFromStartX, deltaFromStartY, false);
                            }
                            else if (mouseButton === 2) { // middle-click + move
                                wvPanViewportTool.applyPanToViewport(viewport, deltaX, deltaY);
                            }
                            else if (mouseButton === 3) { // right-click + move
                                wvZoomViewportTool.applyZoomToViewport(viewport, deltaY);
                            }
                        });

                    });
                });
            };

            this._deactivateInputs = function(viewport) {
                var $enabledElement = $(viewport.getEnabledElement());
                $enabledElement.off('touchstart.windowingTool mousedown.windowingTool');
            };

            this._listenModelChange = angular.noop;
            this._unlistenModelChange = angular.noop;
            this._listenViewChange = angular.noop;
            this._unlistenViewChange = angular.noop;
        }
        Controller.prototype = Object.create(WvBaseTool.prototype)
        Controller.prototype.constructor = Controller;

        return directive;
    }
})();
