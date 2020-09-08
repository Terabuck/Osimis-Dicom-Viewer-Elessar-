/**
 * @ngdoc object
 * @memberOf osimis
 *
 * @name osimis.quality
 *
 * @description
 * These are the image compression qualities available, as
 * processed by the web viewer plugin's backend:
 * 
 *   * `LOW`
 *   * `MEDIUM`
 *   * `LOSSLESS`
 *   * `PIXELDATA`
 * 
 * - @warning the DICOM pixeldata may have already been compressed,
 * therefore lossless quality may provide lossy data!
 */
(function(module) {
    'use strict';
    
    var quality = {
        // reserved value:
        // 'none': 0,

        // 8bit jpeg80 150x150 thumbnail
        'LOW': 1,

        // 8bit jpeg80 1000X1000 thumbnail
        'MEDIUM': 2,

        // compressed in lossless by the orthanc plugin (but may be lossy)
        'LOSSLESS': 100,

        // raw, directly taken from the DICOM file
        'PIXELDATA': 101
    };

    module.quality = quality;

})(this.osimis || (this.osimis = {}));