/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.ZoomViewportTool
 *
 * @description
 * The `ZoomViewportTool` class applies zoom to a viewport.
 */
(function(osimis) {
    'use strict';

    function ZoomViewportTool() {
    };

    ZoomViewportTool.prototype.applyZoomToViewport = function(viewport, delta) {
        var viewportData = viewport.getViewportData();
        var scale = +viewportData.scale;

        viewportData.scale = Math.min(Math.max(scale + (delta / 100), 0.01), 100.0);

        viewport.setViewport(viewportData);
        viewport.draw(false);
    };


    osimis.ZoomViewportTool = ZoomViewportTool;

    angular
        .module('webviewer')
        .factory('wvZoomViewportTool', wvZoomViewportTool);

    /* @ngInject */
    function wvZoomViewportTool() {
        return new osimis.ZoomViewportTool();
    }
})(this.osimis || (this.osimis = {}));