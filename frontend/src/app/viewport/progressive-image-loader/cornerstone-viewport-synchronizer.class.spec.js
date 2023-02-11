describe('progressive image loading', function() {
    
    describe('(U02) CornerstoneViewportSynchronizer class', function() {

        it('(USR-0510, UT0201) shall update the absolute zoom when the image has been rescaled', function() {
            var CornerstoneViewportSynchronizer = new osimis.CornerstoneViewportSynchronizer();

            // Consider the user has done a 2x zoom
            var relativeZoom = 2;

            // Consider the image is displayed at full resolution (relativeZoom == absoluteZoom)
            var baseCsViewport = {
                scale: relativeZoom,
                translation: {
                    x: 0,
                    y: 0
                }
            };
            var baseResolution = {
                width: 400,
                height: 400
            };

            // Considering the image switch half the base resolution (lossless -> medium for instance)
            var newResolution = {
                width: 200,
                height: 200
            };

            // Do the cornerstone viewport conversion
            // deep clone the object so we can compare the new value with the old
            var newCsViewport = _.cloneDeep(baseCsViewport);
            CornerstoneViewportSynchronizer.sync(
                newCsViewport,
                baseResolution,
                newResolution
            );

            // To keep the same zoom perception, the scale must be twice the base value (because 
            // the resolution is now half as the original one)
            assert.equal(newCsViewport.scale, baseCsViewport.scale * 2);
        });

        it('(USR-0510, UT0202) shall compensate the relative pan change induced by the absolute zoom change', function() {
            var CornerstoneViewportSynchronizer = new osimis.CornerstoneViewportSynchronizer();

            // Consider the user has done a 2x zoom
            var relativeZoom = 2;

            // Consider the image has moved the image 100px bottom & 100px right.
            var relativePan = {
                x: 100,
                y: 100
            };

            // Consider the image is displayed at full resolution (relativeZoom == absoluteZoom)
            var baseCsViewport = {
                scale: relativeZoom,
                translation: {
                    x: relativePan.x,
                    y: relativePan.y
                }
            };
            var baseResolution = {
                width: 400,
                height: 400
            };

            // Considering the image switch half the base resolution (lossless -> medium for instance)
            var newResolution = {
                width: 200,
                height: 200
            };

            // Do the cornerstone viewport conversion
            // deep clone the object so we can compare the new value with the old
            var newCsViewport = _.cloneDeep(baseCsViewport);
            CornerstoneViewportSynchronizer.sync(
                newCsViewport,
                baseResolution,
                newResolution
            );

            // To keep the same perspective of position, the translation must be half the base value (because 
            // the change of resolution have scaled up the translation by 2)
            assert.equal(newCsViewport.translation.x, baseCsViewport.translation.x / 2);
            assert.equal(newCsViewport.translation.y, baseCsViewport.translation.y / 2);
        });

    });
});