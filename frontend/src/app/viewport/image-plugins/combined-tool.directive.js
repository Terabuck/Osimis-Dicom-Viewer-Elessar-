/**
 *
 * @description
 * The `wvMobileViewportTool` directive attribute is a `wvViewport` directive
 * plugin. Since the toolbar is disabled on mobile, all the basic mobiles
 * interactions are enabled via this single tool.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvMobileViewportTool', wvMobileViewportTool)  // TODO:: rename into wvCombinedTool. For some weird reason, if the name is not wvMobileViewportTool it does not work (even with the modification in the webviewer.directive.html)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvMobileViewportTool'] = '?^wvMobileViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvMobileViewportTool($parse, WvBaseTool, wvConfig) {
        var directive = {
            require: 'wvMobileViewportTool',
            controller: MobileViewportToolVM,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            // bind attributes -> tool
            var wvMobileViewportToolParser = $parse(attrs.wvMobileViewportTool);
            scope.$watch(wvMobileViewportToolParser, function(isActivated) {
                if (isActivated) {
                    tool.activate();
                }
                else {
                    tool.deactivate();
                }
            });
        }

        /* @ngInject */
        function MobileViewportToolVM($scope, wvConfig, wvPanViewportTool, wvWindowingViewportTool, wvZoomViewportTool) {
            // Enable zoom via pinch
            WvBaseTool.call(this, 'zoomTouchPinch', undefined, false, wvPanViewportTool, wvZoomViewportTool, $scope, false);

            // Cache hammer instances for memory clean up
            var _hammers = {};
            this._activateInputs = function(viewport) {
                var _this = this;
                // Call parent method
                WvBaseTool.prototype._activateInputs.apply(this, arguments);
                var enabledElement = viewport.getEnabledElement();
                _hammers[viewport] = {};

                for (var action in wvConfig.config.combinedToolBehaviour) {

                     if (action === "oneTouchPan") {
                        _hammers[viewport]["oneTouchPan"] = new osi.HammerWrapper(enabledElement, 1, viewport, wvConfig.config.combinedToolBehaviour[action], wvWindowingViewportTool, wvPanViewportTool);
                     } else if (action === "twoTouchPan") {
                        _hammers[viewport]["twoTouchPan"] = new osi.HammerWrapper(enabledElement, 2, viewport, wvConfig.config.combinedToolBehaviour[action], wvWindowingViewportTool, wvPanViewportTool);
                     } else if (action === "threeTouchPan") {
                        _hammers[viewport]["threeTouchPan"] = new osi.HammerWrapper(enabledElement, 3, viewport, wvConfig.config.combinedToolBehaviour[action], wvWindowingViewportTool, wvPanViewportTool);
                     }
                 };

                // install mouse handler
                var $enabledElement = $(viewport.getEnabledElement());

                $enabledElement.on('mousedown.combinedTool', function(e) {
                    var isTouchEvent = !e.pageX && !e.pageY && !!e.originalEvent.touches;
                    var mouseButton = !isTouchEvent ? e.which : 1;
                    var startX = !isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX;
                    var startY = !isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY;
                    var lastX = startX;
                    var lastY = startY;

                    $(document).one('mouseup', function(e) {
                        $(document).unbind('mousemove.combinedTool');
                    });

                    $(document).on('mousemove.combinedTool', function(e) {
                        // Prevent issues on touchscreens.
                        e.preventDefault();

                        $scope.$apply(function() {  // @todo necessary ?
                            var deltaX = (!isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX) - lastX;
                            var deltaY = (!isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY) - lastY;
                            var deltaFromStartX = (!isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX) - startX;
                            var deltaFromStartY = (!isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY) - startY;
                            lastX = !isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX;
                            lastY = !isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY;

                            if (mouseButton === 1 && wvConfig.config.combinedToolBehaviour["leftMouseButton"]) { // left-click + move
                                _this._applyTool(wvConfig.config.combinedToolBehaviour["leftMouseButton"], viewport, deltaX, deltaY, deltaFromStartX, deltaFromStartY);
                            }
                            else if (mouseButton === 2 && wvConfig.config.combinedToolBehaviour["middleMouseButton"]) { // middle-click + move
                                _this._applyTool(wvConfig.config.combinedToolBehaviour["middleMouseButton"], viewport, deltaX, deltaY, deltaFromStartX, deltaFromStartY);
                            }
                            else if (mouseButton === 3 && wvConfig.config.combinedToolBehaviour["rightMouseButton"]) { // right-click + move
                                _this._applyTool(wvConfig.config.combinedToolBehaviour["rightMouseButton"], viewport, deltaX, deltaY, deltaFromStartX, deltaFromStartY);
                            }
                        });
                    });
                });
            };

            this._applyTool = function(toolName, viewport, deltaX, deltaY, deltaFromStartX, deltaFromStartY) {
                if (toolName === "windowing") {
                    wvWindowingViewportTool.applyWindowingToViewport(viewport, deltaX, deltaY, deltaFromStartX, deltaFromStartY, false);
                }
                else if (toolName === "pan") {
                    wvPanViewportTool.applyPanToViewport(viewport, deltaX, deltaY);
                }
                else if (toolName === "zoom") {
                    wvZoomViewportTool.applyZoomToViewport(viewport, deltaY);
                }
            };

            this._deactivateInputs = function(viewport) {
                // Call parent method
                WvBaseTool.prototype._deactivateInputs.apply(this, arguments);

                // Remove touch handlers
                for (var action in _hammers[viewport]) {
                    _hammers[viewport][action].destroy();
                }
                delete _hammers[viewport];

                // Remove mouse handlers
                var $enabledElement = $(viewport.getEnabledElement());
                $enabledElement.off('mousedown.combinedTool');
            };
        }
        MobileViewportToolVM.prototype = Object.create(WvBaseTool.prototype);
        MobileViewportToolVM.prototype.constructor = MobileViewportToolVM;

        return directive;
    }

})();
