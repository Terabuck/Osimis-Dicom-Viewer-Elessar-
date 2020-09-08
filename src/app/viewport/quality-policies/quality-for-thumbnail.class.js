/**
 * @ngdoc method
 * @methodOf osimis
 *
 * @name osimis.QualityForThumbnail
 * @return {Array<osimis.quality>} List of image qualities
 * 
 * @description
 * Display LOW qualities for thumbnail viewports. Except concerning DICOM w/
 * already compressed pixeldata to avoid transcompression overhead. In that
 * case, we provide PIXELDATA quality.
 * 
 * See the `QualityPolicy` interface.
 */
(function(osimis) {
    'use strict';

    function QualityForThumbnail(image) {
        var availableQualities = _.values(image.getAvailableQualities());

        // Show LOW quality in general cases
        if (availableQualities.indexOf(osimis.quality.LOW) !== -1) {
            return [
                osimis.quality.LOW
            ];
        }
        // Show PixelData quality for thumbnail when compressed dicom
        else if (availableQualities.indexOf(osimis.quality.PIXELDATA) !== -1) {
            return [
                osimis.quality.PIXELDATA
            ];
        }
        // Show LOSSLESS quality for thumbnail when compressed dicom pixeldata,
        // but device uncompatible with pixeldata format.
        else if (availableQualities.indexOf(osimis.quality.LOSSLESS) !== -1) {
            return [
                osimis.quality.LOSSLESS
            ];
        }
        // Assert one of the options exists
        else {
            throw new Error('Low quality not available for image.');
        }
    }

    osimis.QualityForThumbnail = QualityForThumbnail;

})(this.osimis || (this.osimis = {}));
