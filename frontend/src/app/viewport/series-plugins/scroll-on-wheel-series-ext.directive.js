/**
 * @ngdoc directive
 * @name webviewer.directive:wvScrollOnWheelSeriesExt
 *
 * @param {boolean} [wvScrollOnWheelSeriesExt=true] Makes the viewport
 *                                                  scrollable.
 *
 * @restrict A
 * @requires webviewer.directive:wvViewport
 * @requires webviewer.directive:vpSeriesId
 *
 * @description
 * The `wvScrollOnWheelSeriesExt` directive let the end-user scroll through a
 * viewport's series via the mouse wheel (or via fingers on mobile).
 **/
 (function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvScrollOnWheelSeriesExt', wvScrollOnWheelSeriesExt)
        .config(function($provide) {
        	$provide.decorator('vpSeriesIdDirective', function($delegate) {
			    var directive = $delegate[0];
		    	directive.require['wvScrollOnWheelSeriesExt'] = '?^wvScrollOnWheelSeriesExt';

                return $delegate;
        	});
        });

    /* @ngInject */
    function wvScrollOnWheelSeriesExt($parse) {
        var directive = {
            require: 'wvScrollOnWheelSeriesExt',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };
        return directive;

        function link(scope, element, attrs, tool) {
            // Switch activate/deactivate based on databound HTML attribute
            var wvScrollOnWheelSeriesExt = $parse(attrs.wvScrollOnWheelSeriesExt);
            scope.$watch(wvScrollOnWheelSeriesExt, function(enabled) {
                if (enabled) {
                    tool.activate();
                } else {
                    tool.deactivate();
                }
            });
        }
    }

    /* @ngInject */
    function Controller($scope, $element, $attrs, hamster, wvPaneManager, wvSeriesManager, wvSynchronizer, wvReferenceLines, wvConfig, wvZoomViewportTool) {
        var vm = this;
        this.wvConfig = wvConfig;

        var _wvSeriesIdViewModels = [];
    	this.register = function(viewmodel) {
            _wvSeriesIdViewModels.push(viewmodel);
    	};
    	this.unregister = function(viewmodel) {
            _.pull(_wvSeriesIdViewModels, viewmodel);
    	};

        this.activate = function() {
            _wvSeriesIdViewModels
                .forEach(registerDesktopEvents);
            _wvSeriesIdViewModels
                .forEach(registerMobileEvents);
        };
        this.deactivate = function() {
            _wvSeriesIdViewModels
                .forEach(unregisterDesktopEvents);
            _wvSeriesIdViewModels
                .forEach(unregisterMobileEvents);
        };

        this.applyTool  = function(series, viewport, toolName, delta) {

            if (toolName === "previousImage") {

                series.goToPreviousImage(true);
                wvSynchronizer.update(series);  
                wvReferenceLines.update(series);

            } else if (toolName === "nextImage") {

                series.goToNextImage(true);
                wvSynchronizer.update(series);          
                wvReferenceLines.update(series);

            } else if (toolName === "zoomIn") {

                wvZoomViewportTool.applyZoomToViewport(viewport, 10 );

            } else if (toolName === "zoomOut") {

                wvZoomViewportTool.applyZoomToViewport(viewport, -10 );
            }
        }


        // Free events on destroy
        $scope.$on('$destroy', function() {
            unregisterDesktopEvents();
            unregisterMobileEvents();
        });

        /* desktop scrolling */

        var hamsterInstance;
        function registerDesktopEvents(viewmodel) {
            // @warning This will only work for one viewport by scrollOnWheel extension
            // we don't need more however. Assert this.
            if (_wvSeriesIdViewModels.length > 1) {
                throw new Error("More than one viewport when using `wvpScrollOnOverSeriesExt` directive.");
            }

            hamsterInstance = hamster($element[0]);
            hamsterInstance.wheel(function(event, delta, deltaX, deltaY) {
                $scope.$apply(function() {
                    var series = viewmodel.getSeries();
                    var panes = wvPaneManager.getAllPanes();

                    if (!series) {
                        return;
                    }
                    else if (deltaY < 0) {
                        vm.applyTool(series, viewmodel.getViewport(), vm.wvConfig.config['mouseWheelBehaviour']['down'], -deltaY);
                    }
                    else if (deltaY > 0) {
                        vm.applyTool(series, viewmodel.getViewport(), vm.wvConfig.config['mouseWheelBehaviour']['up'], deltaY);
                    }
                });

                // prevent horizontal & vertical page scrolling
                event.preventDefault();
            });
        }

        function unregisterDesktopEvents(viewmodel) {
            if (hamsterInstance) {
                // This won't disable events from other viewports due to the way
                // hamster is instanciated.
                if (hamsterInstance.unwheel) {
                    hamsterInstance.unwheel();
                }

                hamsterInstance = null;
            }
        }

        /* mobile scrolling */

        var _hammertimeObjectsByViewport = {};
        var _mobileEvtBySeriesVM = {};

        function registerMobileEvents(viewmodel) {
            // Prevent on non-mobile platform (ie. desktop touchscreen) to
            // avoid conflicts with other tools such as paning.
            var uaParser = new UAParser();
            vm.isMobile = (uaParser.getDevice().type === 'mobile');
            if (!vm.isMobile) {
                return;
            }

            // Configure the dom element
            // Use the enabledElement instead of the current element
            // to avoid hammertime making the overlay unselectable
            var enabledElement = viewmodel.getViewport().getEnabledElement();
            var hammertime = new Hammer(enabledElement, {
                inputClass: Hammer.TouchInput // disable panning on desktop
            });
            hammertime.get('tap').set({
                pointers: 1
            });

            // Cache the hammertime object for future destruction
            _hammertimeObjectsByViewport[viewmodel] = hammertime;

            // Add the panning event
            _mobileEvtBySeriesVM[viewmodel] = onMobilePanning;
            hammertime.on('tap', _mobileEvtBySeriesVM[viewmodel]);

            // React to panning
            function onMobilePanning(evt) {
                var series = viewmodel.getSeries();
                if (!series) {
                    return;
                }
                var location = detectTapLocation(evt.center.x, evt.center.y);
                if(location === null){
                    return;
                }

                if (location === Hammer.DIRECTION_LEFT) {
                    series.goToPreviousImage();
                }
                else if (location === Hammer.DIRECTION_RIGHT) {
                    series.goToNextImage();
                }
            }

            function detectTapLocation(x, y){
                var rect = enabledElement.getBoundingClientRect();
                var leftSide = {"from": rect.left, "to": rect.left + ((rect.right - rect.left)/3)};
                var rightSide = {"from": rect.right - ((rect.right - rect.left)/3), "to": rect.right};
                if(x > leftSide.from && x < leftSide.to){
                    return Hammer.DIRECTION_LEFT;
                }else if(x > rightSide.from && x < rightSide.to){
                    return Hammer.DIRECTION_RIGHT
                }else {
                    return null
                }
            }
        };
        function unregisterMobileEvents(viewmodel) {
            // Prevent on non-mobile platform (ie. desktop touchscreen) to
            // avoid conflicts with other tools such as paning.
            var uaParser = new UAParser();
            vm.isMobile = (uaParser.getDevice().type === 'mobile');
            if (!vm.isMobile) {
                return;
            }

            if (_hammertimeObjectsByViewport[viewmodel]) {
                var hammertime = _hammertimeObjectsByViewport[viewmodel];
                hammertime.off('pan', _mobileEvtBySeriesVM[viewmodel])
                delete _hammertimeObjectsByViewport[viewmodel];
            }
        }


        // listen to events...
        //mc.on("panleft panright panup pandown tap press", function(ev) {
        //    myElement.textContent = ev.type +" gesture detected.";
        //});

    }
})();
