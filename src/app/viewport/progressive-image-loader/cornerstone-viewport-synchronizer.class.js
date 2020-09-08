/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.CornerstoneViewportSynchronizer
 * 
 * @description
 * 
 * The `CornerstoneViewportSynchronizer` class convert the cornerstone viewport data (scale & translation) from 
 * an old resolution to a new one resolution. It maintains the same perception of zoom and pan
 * for the user.
 *
 * # @definition 'Relative zoom' The zoom as seen by the user, not impacted by image resolution.
 * # @definition 'Absolute zoom' The zoom used by cornerstone, changed to compensate the resolution.
 * 
 * For instance, an image A may be shown in resolution MEDIUM. An image B of resolution LOSSLESS may be 
 * displayed just after. The viewport data have to keep the same zoom ratio when the image change. However
 * the image have two different resolutions. Viewport data must therefore be converted from resolution
 * MEDIUM to resolution LOSSLESS: to keep the same relative zoom, the image must be zoomed out (in terms of 
 * absolute zoom) and the pan has to be adapted (to compensate the absolute zoom change).
 * 
 * Exclusively instantiated within the viewport class (see `viewport.class.js` file).
 * 
 * # @rationale
 * The `wvViewport` directive handle progressive image loading. Image are therefore (most of the time) loaded at a lower
 * resolutions first and then get their quality _enhanced_. The user should see no change between the two resolutions except
 * the quality enhancement. 
 * When the image's resolution increase, the viewport must therefore be downscaled to keep the same zoom. The only way to
 * achieve this in CornerstoneJS is to change the `csViewport.scale` parameter. Changing it however impacts the perception of
 * the panning (in conjunction with the `csViewport.translate` parameter).
 *
 * We need an abstraction layer that provides two parameters for both the zoom and the resolution (instead of just the zoom
 * for both matters) and to correct the translation change induced by the difference of resolution.
 *
 * # @todo Move the following responsability out?
 * On top of that, to be able to provide the relative zoom level, we need to retrieve change induced via
 * tools (ie ww/wc tool) - via polling.
 */
(function(osimis) {
    'use strict';

    function CornerstoneViewportSynchronizer() { // cs for cornerstone
        
    };

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportSynchronizer
     * 
     * @name osimis.CornerstoneViewportSynchronizer#_retrieveResolutionScaleRatio
     * @param {object} baseBinaryResolution The base binary resolution
     * @param {object} newBinaryResolution The new binary resolutio
     *
     * @description
     * # @warning This method expect resolution scale to be the same for both side (width and height),
     *            this constraint is not verified for performance reasons.
     */
    function _retrieveResolutionScaleRatio(baseResolution, newResolution) {
        return baseResolution.width / newResolution.width;
    }

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportSynchronizer
     * 
     * @name osimis.CornerstoneViewportSynchronizer#sync
     * @param {object} cornersoneViewportData The data to sync
     * @param {object} baseBinaryResolution The base binary resolution
     * @param {object} newBinaryResolution The new binary resolutio
     */
    CornerstoneViewportSynchronizer.prototype.sync = function(cornerstoneViewportData, baseResolution, newResolution) {
        var resolutionScaleRatio = _retrieveResolutionScaleRatio(baseResolution, newResolution);

        // Adapt scale
        cornerstoneViewportData.scale *= resolutionScaleRatio;

        // Compensate translation induced by the new scale
        cornerstoneViewportData.translation.x /= resolutionScaleRatio;
        cornerstoneViewportData.translation.y /= resolutionScaleRatio;
    };

    osimis.CornerstoneViewportSynchronizer = CornerstoneViewportSynchronizer;

})(this.osimis || (this.osimis = {}));