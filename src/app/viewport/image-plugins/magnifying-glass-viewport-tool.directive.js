(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvMagnifyingGlassViewportTool', wvMagnifyingGlassViewportTool)
        .config(function($provide) {
            $provide.decorator('wvViewportDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvMagnifyingGlassViewportTool'] = '?^wvMagnifyingGlassViewportTool';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvMagnifyingGlassViewportTool($parse, WvBaseTool) {
        var directive = {
            require: 'wvMagnifyingGlassViewportTool',
            controller: MagnifyingGlassCtrl,
            link: link,
            restrict: 'A',
            scope: false
        };

        function link(scope, element, attrs, tool) {
            var wvMagnifyingGlassViewportToolParser = $parse(attrs.wvMagnifyingGlassViewportTool);
            
            // bind attributes -> tool
            scope.$watch(wvMagnifyingGlassViewportToolParser, function(newConfig, oldConfig) {
                // Set magnifying glass configuration.
                var csConfig = {
                    // Canvas' width/height in pixel.
                    magnifySize: newConfig.magnifyingGlassSize,
                    // Zoom depth.
                    magnificationLevel: newConfig.magnificationLevel
                };

                cornerstoneTools.magnify.setConfiguration(csConfig);

                // The `cornerstoneTools.magnify.setConfiguration` method
                // doesn't update the configuration. We have to manualy disable
                // the magnify tool to reset it.
                if (oldConfig.enabled || !newConfig.enabled && oldConfig !== newConfig) {
                    tool.deactivate();
                }

                // Activate back the magnifying.
                if (newConfig.enabled) {
                    tool.activate();
                    // Ensure the magnifying glass always stay on top of
                    // everything.
                    var magnifyingGlassCanvasJqEl = $('.magnifyTool');
                    var magnifyingGlassCanvasEl = magnifyingGlassCanvasJqEl[0];
                    magnifyingGlassCanvasJqEl.css('z-index', 1000000);
                    // The `cornerstoneTools.magnify.setConfiguration` method
                    // doesn't update the glass size. We have to manually change
                    // the magnifying glass size.
                    if (oldConfig.magnifyingGlassSize !== newConfig.magnifyingGlassSize) {
                        magnifyingGlassCanvasEl.width = csConfig.magnifySize;
                        magnifyingGlassCanvasEl.height = csConfig.magnifySize;
                    }
                }
            }, true);
        }

        /* @ngInject */
        function MagnifyingGlassCtrl(wvPanViewportTool, wvZoomViewportTool, $scope) {
            WvBaseTool.call(this, 'magnify', 'magnifyTouchDrag', false, wvPanViewportTool, wvZoomViewportTool, $scope);

            // BaseTool class as been made for annotation. This is not one.
            // We overide this method so the glass is not shown once toggled
            // off. When we deactivate an annotation, we let the annotation
            // shown, but only deactivate the inputs.
            // For tools related to cornerstone (@todo split BaseTool in AnnotationTools & others)
            this._deactivateInputs = function(viewport) {
                // Unlisten to events
                var enabledElement = viewport.getEnabledElement();
                cornerstoneTools.mouseInput.disable(enabledElement);
                cornerstoneTools.touchInput.disable(enabledElement);

                // Set tool in disable mode.
                cornerstoneTools[this.toolName].disable(enabledElement, 1);
                if (this.toolName2) {
                    cornerstoneTools[this.toolName2].disable(enabledElement);
                }
            };
            this.register = function(viewport) {
                this.viewports.push(viewport)

                if (this.isActivated) {
                    this.activate(viewport);
                }
            };
            this.unregister = function(viewport) {
                if (cornerstoneTools[this.toolName]) {
                    // Set tool in disable mode (it's a 1D state machine with 4
                    // states) - don't display annotations & ignore inputs.
                    // 1. Retrieve DOM element
                    var enabledElement = viewport.getEnabledElement();
                    // 2. Ignore exception if no image is shown in the viewport
                    var isElementEnabled = undefined;
                    try {
                        isElementEnabled = true;
                        cornerstone.getEnabledElement(enabledElement); 
                    }
                    catch (exc) {
                        isElementEnabled = false;
                    }
                    // 3. Change tool state
                    // if (isElementEnabled) {
                    //     cornerstoneTools[this.toolName].enable(enabledElement, 1);
                    //     if (this.toolName2) {
                    //         cornerstoneTools[this.toolName2].activate(enabledElement);
                    //     }
                    // }
                }

                this._unlistenModelChange(viewport);
                
                _.pull(this.viewports, viewport);
            };
        }
        MagnifyingGlassCtrl.prototype = Object.create(WvBaseTool.prototype)
        MagnifyingGlassCtrl.prototype.constructor = MagnifyingGlassCtrl;
        
        return directive;
    }

})();