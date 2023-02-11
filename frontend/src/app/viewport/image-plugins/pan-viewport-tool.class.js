/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.PanViewportTool
 *
 * @description
 * The `PanViewportTool` class applies panning to a viewport.
 */
(function(osimis) {
    'use strict';

    function PanViewportTool() {
    };

    PanViewportTool.prototype.applyPanToViewport = function(viewport, deltaX, deltaY) {
        var viewportData = viewport.getViewportData();

        var scale = +viewportData.scale;
        var x = +viewportData.translation.x;
        var y = +viewportData.translation.y;

        viewportData.translation.x = x + (deltaX / scale);
        viewportData.translation.y = y + (deltaY / scale);

        viewport.setViewport(viewportData);
        viewport.draw(false);
    };


    osimis.PanViewportTool = PanViewportTool;

    angular
        .module('webviewer')
        .factory('wvPanViewportTool', wvPanViewportTool);

    /* @ngInject */
    function wvPanViewportTool() {
        return new osimis.PanViewportTool();
    }
})(this.osimis || (this.osimis = {}));