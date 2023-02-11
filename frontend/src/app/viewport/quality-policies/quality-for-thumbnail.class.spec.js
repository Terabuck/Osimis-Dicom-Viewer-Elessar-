describe('progressive image loading', function() {
    describe('(U06) Quality Policy For Thumbnail Viewport', function() {
        it('(USR-0502, UT0601) shall set LOW quality for thumbnails when no transcompression is involved', function() {
            var fakeImage = {
                getAvailableQualities: function() {
                    return [osimis.quality.LOW]
                }
            };

            var qualityForThumbnail = osimis.QualityForThumbnail(fakeImage);

            assert.deepEqual(qualityForThumbnail, [
                osimis.quality.LOW
            ], "Thumbnails should display LOW quality when no transcompression is involved");
        });

        it('(USR-0502) shall set PIXELDATA quality for thumbnails when transcompression is involved', function() {
            var fakeImage = {
                getAvailableQualities: function() {
                    return [osimis.quality.PIXELDATA]
                }
            };
            
            var qualityForThumbnail = osimis.QualityForThumbnail(fakeImage);

            assert.deepEqual(qualityForThumbnail, [
                osimis.quality.PIXELDATA
            ], "Thumbnails should display PIXELDATA quality when transcompression is involved");
        });
    });
});
