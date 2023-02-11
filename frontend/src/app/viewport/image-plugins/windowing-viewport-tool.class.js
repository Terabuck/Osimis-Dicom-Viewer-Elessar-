/**
 * @ngdoc object
 * @memberOf osimis
 *
 * @name osimis.WindowingViewportTool
 *
 * @description
 * The `WindowingViewportTool` class applies windowing to a viewport.
 */
(function(osimis) {
    'use strict';

    /* @ngInject */
    function WindowingViewportTool(wvConfig, wvSeriesManager, wvSynchronizer) {
    	this._wvConfig = wvConfig;
        this._wvSeriesManager = wvSeriesManager;
        this._wvSynchronizer = wvSynchronizer;

        this.applyWindowingToPane = function(pane, windowWidth, windowCenter, applyToSynchronizedViewports) {

            if (!pane.csViewport) {
                return;
            }

            // Apply windowing.
            pane.applyWindowing(windowWidth, windowCenter);

            if (applyToSynchronizedViewports) {
                this._applyWindowingToSynchronizedViewports(pane.series, windowWidth, windowCenter);
            }
        };

        this._applyWindowingToSynchronizedViewports = function(series, windowWidth, windowCenter) {
            var synchronizedPanes = this._wvSynchronizer.getListOfSynchronizedPanes(series);
            for (var i = 0; i < synchronizedPanes.length; i++) {
                var pane = synchronizedPanes[i];
                pane.applyWindowing(windowWidth, windowCenter);
            }
        };

	    this.applyWindowingToViewport = function(viewport, deltaX, deltaY, deltaFromStartX, deltaFromStartY, applyToSynchronizedViewports) {
	        var viewportData = viewport.getViewportData();

	        // Retrieve image min/max image pixel value and define a
	        // strength parameter proportional to the dynamic range of the
	        // image, so high dynamic images have larger windowing changes
	        // than low dynamic ones.
	        var minPixelValue = viewport.getCurrentImageMinPixelValue();
	        var maxPixelValue = viewport.getCurrentImageMaxPixelValue();
	        var pixelValueDelta = maxPixelValue - minPixelValue;
            var distanceFromStartPoint = Math.sqrt(deltaFromStartX * deltaFromStartX + deltaFromStartY * deltaFromStartY);
            var strength = 1;

            // fine tuning in the first 50 pixels (move 1 pixel = change value WW/WC by 1)
            // then, increase the sensitivity in the next N pixels such that, when
            // the distance is greater than 50+N, moving by 1 pixel changes the WW/WC value by pixelValueDelta/2*N
            // examples when N = 200:
            // image      pixelValueDelta        first 50 pixels     from 100->101   from 200->201
            // MRI            2374                   1                   3.3             6.9
            // RX             1006                   1                   1.5             3.5
            // test image    58000                   1                  30.5           145.6
            var highSensitivityDistance = 200;
            if (distanceFromStartPoint > 50)
            {
                strength = Math.min(1, (distanceFromStartPoint - 50) / (highSensitivityDistance + 50));
                strength = 1 + strength * (pixelValueDelta / (2 * highSensitivityDistance));
            }

            //console.log(pixelValueDelta, distanceFromStartPoint, strength);

	        var deltaWW = 0;
	        var deltaWC = 0;

	        if (deltaX < 0) {
	            if (this._wvConfig.config.windowingBehaviour.left == "increase-ww") { deltaWW = -deltaX; }
	            if (this._wvConfig.config.windowingBehaviour.left == "decrease-ww") { deltaWW = deltaX; }
	            if (this._wvConfig.config.windowingBehaviour.left == "increase-wc") { deltaWC = -deltaX; }
	            if (this._wvConfig.config.windowingBehaviour.left == "decrease-wc") { deltaWC = deltaX; }
	        }
	        if (deltaX > 0) {
	            if (this._wvConfig.config.windowingBehaviour.right == "increase-ww") { deltaWW = deltaX; }
	            if (this._wvConfig.config.windowingBehaviour.right == "decrease-ww") { deltaWW = -deltaX; }
	            if (this._wvConfig.config.windowingBehaviour.right == "increase-wc") { deltaWC = deltaX; }
	            if (this._wvConfig.config.windowingBehaviour.right == "decrease-wc") { deltaWC = -deltaX; }
	        }
	        if (deltaY < 0) {
	            if (this._wvConfig.config.windowingBehaviour.up == "increase-ww") { deltaWW = -deltaY; }
	            if (this._wvConfig.config.windowingBehaviour.up == "decrease-ww") { deltaWW = deltaY; }
	            if (this._wvConfig.config.windowingBehaviour.up == "increase-wc") { deltaWC = -deltaY; }
	            if (this._wvConfig.config.windowingBehaviour.up == "decrease-wc") { deltaWC = deltaY; }
	        }
	        if (deltaY > 0) {
	            if (this._wvConfig.config.windowingBehaviour.down == "increase-ww") { deltaWW = deltaY; }
	            if (this._wvConfig.config.windowingBehaviour.down == "decrease-ww") { deltaWW = -deltaY; }
	            if (this._wvConfig.config.windowingBehaviour.down == "increase-wc") { deltaWC = deltaY; }
	            if (this._wvConfig.config.windowingBehaviour.down == "decrease-wc") { deltaWC = -deltaY; }
	        }

	        // Calculate the new ww/wc.
	        var newWindowWidth = +viewportData.voi.windowWidth + (deltaWW * strength);
	        var newWindowCenter = +viewportData.voi.windowCenter + (deltaWC * strength);

	        if (newWindowWidth <= 1) {
	            newWindowWidth = 1;
	        }

            viewportData.voi.windowWidth = newWindowWidth;
            viewportData.voi.windowCenter = newWindowCenter;
            viewportData.voi.hasModifiedWindowing = true;

            // Update viewport values & redraw the viewport.
	        viewport.setViewport(viewportData);
	        viewport.draw(false);

	        if (applyToSynchronizedViewports) {
	        	var image = viewport.getImage();
                var this_ = this;
	        	this._wvSeriesManager.get(image.instanceInfos.SeriesId).then(function(series) {
                    this_._applyWindowingToSynchronizedViewports(series, newWindowWidth, newWindowCenter);
                });
	        }
	    };
	}

    osimis.WindowingViewportTool = WindowingViewportTool;

    angular
        .module('webviewer')
        .factory('wvWindowingViewportTool', wvWindowingViewportTool);

    /* @ngInject */
    function wvWindowingViewportTool(wvConfig, wvSeriesManager, wvSynchronizer) {
        return new osimis.WindowingViewportTool(wvConfig, wvSeriesManager, wvSynchronizer);
    }
})(this.osimis || (this.osimis = {}));
