describe('progressive image loading', function() {
    describe('(U04) Quality Policy For Diagnostic Viewport', function() {
        it('(USR-0502, UT0401) shall set the image\'s lowest downloaded quality to the highest one available in cache if the image is already cached\n\
            so we don\'t waste time downloading a quality that is lower than what we already have', function() {
            // Fake binary cache
            var binariesCache = new osimis.ImageBinariesCache();

            // Create an image with available qualities
            var image = new mock.Image({
                id: 'xxx',
                availableQualities: [
                    osimis.quality.LOW,
                    osimis.quality.MEDIUM,
                    osimis.quality.LOSSLESS,
                ],
                imageBinariesCache: binariesCache
            });

            // Add low & medium in cache
            var binary1 = image.loadBinary(osimis.quality.LOW);
            var binary2 = image.loadBinary(osimis.quality.MEDIUM);

            // Wait for the download to be finished before checking
            return Promise
                .all([binary1, binary2])
                .then(function() {
                    // Check if policy's minimum is medium instead of thumbnail
                    var suggestedQualities = osimis.QualityForDiagnosis(image);
                    assert.equal(suggestedQualities[0], osimis.quality.MEDIUM);

                    // Perform the same check after removing thumbnails from cache
                    binariesCache.remove('xxx', osimis.quality.LOW);
                    suggestedQualities = osimis.QualityForDiagnosis(image);
                    assert.equal(suggestedQualities[0], osimis.quality.MEDIUM);
                });
        });

        it('(USR-0502, UT0402) shall set the image\'s lowest downloaded quality to the thumbnail quality if the image is not already cached\n\
            so we get the image to display as fast as possible', function() {
            // Create an image with no LOW available qualities
            var image = new mock.Image({
                id: 'xxx',
                availableQualities: [
                    osimis.quality.MEDIUM,
                    osimis.quality.LOSSLESS,
                ]
            });

            // Check if policy's minimum is medium instead of thumbnail
            var suggestedQualities = osimis.QualityForDiagnosis(image);
            assert.equal(suggestedQualities[0], osimis.quality.MEDIUM);
        });

        it('(USR-0502, UT0403) shall set the image\'s highest downloaded quality to the highest one available\n\
            so we provide the highest possible quality for medical diagnosis', function() {
            // Create an image with PIXELDATA as available qualities
            var image = new mock.Image({
                id: 'xxx',
                availableQualities: [
                    osimis.quality.LOW,
                    osimis.quality.MEDIUM,
                    osimis.quality.PIXELDATA
                ]
            });

            // Check image with pixeldata
            var suggestedQualities = osimis.QualityForDiagnosis(image);
            assert.equal(suggestedQualities[suggestedQualities.length-1], osimis.quality.PIXELDATA);

            // Create an image with LOSSLESS as available qualities
            var image2 = new mock.Image({
                id: 'xxx',
                availableQualities: [
                    osimis.quality.LOW,
                    osimis.quality.MEDIUM,
                    osimis.quality.LOSSLESS
                ]
            });

            // Check image with lossless
            var suggestedQualities2 = osimis.QualityForDiagnosis(image2);
            assert.equal(suggestedQualities2[suggestedQualities2.length-1], osimis.quality.LOSSLESS);
        });

        it('(USR-0502, UT0404) shall download all the intermediary qualities available between the lowest and the highest downloaded ones\n\
            so we download the image progressively', function() {
            // Create an image with available qualities in reverse order
            var image = new mock.Image({
                id: 'xxx',
                availableQualities: [
                    osimis.quality.LOSSLESS,
                    osimis.quality.MEDIUM,
                    osimis.quality.LOW
                ]
            });

            // Check all the available qualities are suggested in order
            var suggestedQualities = osimis.QualityForDiagnosis(image);
            assert.equal(suggestedQualities[0], osimis.quality.LOW);
            assert.equal(suggestedQualities[1], osimis.quality.MEDIUM);
            assert.equal(suggestedQualities[2], osimis.quality.LOSSLESS);
        });
    });
});
