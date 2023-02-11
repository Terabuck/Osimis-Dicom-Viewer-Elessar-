describe('progressive image loading', function() {
    
    describe('(U03) ProgressiveImageLoader class', function() {

        it('(USR-0502, UT0301) shall load image binaries progressively', function(done) {
            // Init image and 
            // - Enforce loading order by quality
            var imageBinaryManager = new mock.ImageBinaryManager({
                timeoutByQuality: {
                    LOW: 0,
                    MEDIUM: 20,
                    LOSSLESS: 40
                }
            });
            var qualities = [
                osimis.quality.LOW,
                osimis.quality.MEDIUM,
                osimis.quality.LOSSLESS
            ];
            var image = new mock.Image({
                availableQualities: qualities,
                imageBinaryManager: imageBinaryManager
            });

            // Load image binaries via the progressive image loader
            var progressiveImageLoader = new osimis.ProgressiveImageLoader(Promise, image, qualities);
            progressiveImageLoader.loadBinaries();

            // Check the images are loaded in order
            var loadedQualities = [];
            progressiveImageLoader.onBinaryLoaded(this, function(quality, csImageObject) {
                loadedQualities.push(quality);

                // Once the max quality has been loaded
                if (quality === osimis.quality.LOSSLESS) {
                    // Check all the qualities have been loaded in order
                    assert.deepEqual(loadedQualities, qualities, "Binaries should be loaded in order");
                    done();
                }
            });
        });
        
        it('(USR-0502, UT0302) shall bypass lower quality download when higher ones are already availables', function(done) {
            // Init image and 
            // - Enforce medium loading after lossless
            var imageBinaryManager = new mock.ImageBinaryManager({
                timeoutByQuality: {
                    LOW: 0,
                    LOSSLESS: 20,
                    MEDIUM: 100
                }
            });
            var qualities = [
                osimis.quality.LOW,
                osimis.quality.MEDIUM,
                osimis.quality.LOSSLESS
            ];
            var image = new mock.Image({
                availableQualities: qualities,
                imageBinaryManager: imageBinaryManager
            });

            // Load image binaries via the progressive image loader
            var progressiveImageLoader = new osimis.ProgressiveImageLoader(Promise, image, qualities);
            progressiveImageLoader.loadBinaries();

            // Check the images are loaded in order
            var loadedQualities = [];
            progressiveImageLoader.onBinaryLoaded(this, function(quality, csImageObject) {
                loadedQualities.push(quality);

                // Once the max quality has been loaded
                if (quality === osimis.quality.LOSSLESS) {
                    // Check all the qualities have been loaded in order
                    assert.deepEqual(loadedQualities, [
                        osimis.quality.LOW,
                        osimis.quality.LOSSLESS
                    ], "Medium quality should not have been triggered since it has been loaded after MEDIUM");
                    done();
                }
            });
        });

        it('(USR-0502, UT0303) shall abort all the loading binaries\' requests when requested', function() {
            // Init image and 
            // - bind to a binary manager we can spy on
            var imageBinaryManager = new mock.ImageBinaryManager({
                Promise: Promise
            });
            var qualities = [
                osimis.quality.LOW,
                osimis.quality.MEDIUM,
                osimis.quality.LOSSLESS
            ];
            var image = new mock.Image({
                availableQualities: qualities,
                imageBinaryManager: imageBinaryManager
            });

            // Spy the image abortion
            sinon.spy(imageBinaryManager, 'abortLoading');

            // Load image binaries via the progressive image loader
            var progressiveImageLoader = new osimis.ProgressiveImageLoader(Promise, image, qualities);
            progressiveImageLoader.loadBinaries();

            // Abort binaries loading
            progressiveImageLoader.abortBinariesLoading();

            // Expect the loadings to have been aborted
            assert.equal(imageBinaryManager.abortLoading.callCount, 3, "abortLoading should have been called 3 times");
            assert(imageBinaryManager.abortLoading.firstCall.calledWith(image.id, osimis.quality.LOW, 0));
            assert(imageBinaryManager.abortLoading.secondCall.calledWith(image.id, osimis.quality.MEDIUM, 0));
            assert(imageBinaryManager.abortLoading.thirdCall.calledWith(image.id, osimis.quality.LOSSLESS, 0));
        });

        it('(USR-0502, UT0304) shall free the downloaded of the previous downloaded binary once a higher quality one has been downloaded', function(done) {
            // Init image and 
            // - Enforce LOW loading prior to LOSSLESS
            var imageBinaryManager = new mock.ImageBinaryManager({
                timeoutByQuality: {
                    LOW: 0,
                    LOSSLESS: 20
                }
            });
            var qualities = [
                osimis.quality.LOW,
                osimis.quality.LOSSLESS
            ];
            var image = new mock.Image({
                availableQualities: qualities,
                imageBinaryManager: imageBinaryManager
            });

            // Spy the image abortion
            sinon.spy(imageBinaryManager, 'abortLoading');

            // Load image binaries via the progressive image loader
            var progressiveImageLoader = new osimis.ProgressiveImageLoader(Promise, image, qualities);
            progressiveImageLoader.loadBinaries();

            // Check the images are loaded in order
            var loadedQualities = [];
            progressiveImageLoader.onBinaryLoaded(this, function(quality, csImageObject) {
                loadedQualities.push(quality);

                // Once the max quality has been loaded
                if (quality === osimis.quality.LOSSLESS) {
                    // Expect LOW to have been loaded
                    assert.deepEqual(loadedQualities, [osimis.quality.LOW, osimis.quality.LOSSLESS], "LOW should have been loaded prior to LOSSLESS");

                    // Expect LOW to have been cleaned
                    assert.equal(imageBinaryManager.abortLoading.callCount, 1, "abortLoading should have been called once");
                    assert(imageBinaryManager.abortLoading.firstCall.calledWith(image.id, osimis.quality.LOW, 0), 'LOW should have been cleaned');

                    done();
                }
            });
        });

        it('(USR-0502, UT0305) shall free the downloaded of the downloaded binary when it has a lower quality then the previous one', function(done) {
            // Init image and 
            // - Enforce LOW loading after LOSSLESS
            var imageBinaryManager = new mock.ImageBinaryManager({
                timeoutByQuality: {
                    LOW: 20,
                    LOSSLESS: 0
                }
            });
            var qualities = [
                osimis.quality.LOW,
                osimis.quality.LOSSLESS
            ];
            var image = new mock.Image({
                availableQualities: qualities,
                imageBinaryManager: imageBinaryManager
            });

            // Spy the image abortion
            sinon.spy(imageBinaryManager, 'abortLoading');

            // Load image binaries via the progressive image loader
            var progressiveImageLoader = new osimis.ProgressiveImageLoader(Promise, image, qualities);
            progressiveImageLoader.loadBinaries();

            // Check the LOW quality loading fails due to LOSSLESS being loaded prior to it
            var loadedQualities = [];
            progressiveImageLoader.onBinaryLoaded(this, function(quality, csImageObject) {
                loadedQualities.push(quality);
            });
            progressiveImageLoader.onLoadingFailed(this, function(quality, err) {
                // Once the LOW quality has been aborted
                if (quality === osimis.quality.LOW) {
                    // Expect LOSSLESS to have been loaded
                    assert.deepEqual(loadedQualities, [osimis.quality.LOSSLESS], "LOSSLESS should have been loaded prior to LOW");

                    // Expect LOW to have been cleaned
                    assert.equal(imageBinaryManager.abortLoading.callCount, 1, "abortLoading should have been called once");
                    assert(imageBinaryManager.abortLoading.firstCall.calledWith(image.id, osimis.quality.LOW, 0), 'LOW should have been cleaned');

                    done();
                }
            });
        });

    });
});