/**
 * @ngdoc method
 * @methodOf osimis
 *
 * @name osimis.QualityForDiagnosis
 * @param {osimis.Image} image Image model instance
 * @return {Array<osimis.quality>} List of image qualities
 * 
 * @description
 * Don't display lowest qualities when better ones are already cached: for
 * instance if lossless is already available in cache, don't download thumbnail
 * again.
 * 
 * See the `QualityPolicy` interface.
 */
(function(module) {
    'use strict';

    function QualityForDiagnosis(image) {
        var availableQualities = _.values(image.getAvailableQualities());
        var qualitiesToLoad = [];
    
        // Set lossless as desired quality
        var desiredQuality;
        if (availableQualities.indexOf(module.quality.PIXELDATA) !== -1) {
            desiredQuality = module.quality.PIXELDATA;
        }
        else if (availableQualities.indexOf(module.quality.LOSSLESS) !== -1) {
            desiredQuality = module.quality.LOSSLESS;
        }
        else {
            throw new Error('Image doesn\'t have Lossless quality');
        }

        // Set the lowest quality we want to draw
        var minimumQuality = image.getBestQualityInCache() || 0;
    
        // Override desired quality to a better one if already in cache
        var maximumQuality = desiredQuality > minimumQuality ? desiredQuality : minimumQuality;
    
        // Start loading binaries from the highest cached quality to the desired quality
        for (var prop in availableQualities) {
            var quality = availableQualities[prop];
            if (quality >= minimumQuality && quality <= maximumQuality) {
                qualitiesToLoad.push(quality);
            }
        }

        // Sort quality array in ASC
        qualitiesToLoad = qualitiesToLoad.sort(function(a,b) { return a-b; });

        return qualitiesToLoad;
    }
    
    module.QualityForDiagnosis = QualityForDiagnosis;

})(this.osimis || (this.osimis = {}));
