/**
 * Viewport tests
 *
 * This does not contains & test binaries (this could be done in integration testing)
 */
describe('viewport', function() {

    // @note Ignored because karma does not seem to [be configured to] work
    // with the newest cornerstone versions that uses the generic webpack 
    // module manager.
    xdescribe('(U05) class', function() {
        var viewport;

        beforeEach(function() {
            // Mock cornerstone
            sinon.stub(cornerstone, 'updateImage');

            // Init the viewport
            var domElement = $('<div></div>')[0];
            viewport = new osimis.Viewport(
                // Deps
                Promise,
                cornerstone,
                // Opts
                domElement,
                true
            );

            // Spy synchronizers
            sinon.spy(viewport._CornerstoneAnnotationSynchronizer, 'syncByAnnotationType');
            sinon.spy(viewport._CornerstoneViewportSynchronizer, 'sync');
        });
        
        afterEach(function() {
            // Remove spys
            viewport._CornerstoneAnnotationSynchronizer.syncByAnnotationType.restore();
            viewport._CornerstoneViewportSynchronizer.sync.restore();
            cornerstone.updateImage.restore();
            
            // Reset object
            viewport = null;
        });

        it('(USR-0502, UT0501) shall draw image\'s resolutions progressively', function(done) {
            // Set fake image with default 3 qualities
            var image = new mock.Image({
                availableQualities: [
                    osimis.quality.LOW,
                    osimis.quality.MEDIUM,
                    osimis.quality.LOSSLESS
                ]
            });
            viewport.setImage(image);

            // Check downloaded images are not displayed
            assert.equal(cornerstone.updateImage.callCount, 0, 'updateImage shouldn\'t have been called yet');

            // Jump to downloaded state using setTimout (as all promises as been mocked to return in 0ms)
            // @note Throw in promises will no be raised..
            setTimeout(function() {
                // Check the 3 binaries of the image have been displayed
                assert.equal(cornerstone.updateImage.callCount, 3, 'updateImage should have been called 3 times');

                // Clean stuffs
                viewport.destroy();

                done();
            }, 0);
        });

        // No need to test the images are drawn in the right order, etc. as this is managed and
        // tested in the `ImageProgressiveLoader` tests

        it('shall draw a new image and abort the previous one\'s downloads', function(done) {
            // Set fake image with default 3 qualities
            var image = new mock.Image({});
            viewport.setImage(image);

            // Set fake image #2 with default 3 qualities
            var image2 = new mock.Image({
                availableQualities: [
                    osimis.quality.LOSSLESS
                ]
            });
            viewport.setImage(image2);

            // Jump to downloaded state using setTimout (as all promises as been mocked to return in 0ms)
            // @note Throw in promises will no be raised..
            setTimeout(function() {
                // Check the binary of the second image has been displayed
                // As the image2 is displayed before the image1 has been loaded,
                // image1 downloads are aborted
                assert.equal(cornerstone.updateImage.callCount, 1, 'updateImage should have been called once');

                // Clean stuffs
                viewport.destroy();
                
                done();
            }, 0);
        });

        // Test disabled since we have move CornerstoneAnnotationSynchronizer
        // in another class. We should do additional setup to test it.
        xit('(USR-0510, UT0502) shall synchronize cornerstone viewport datas when resolution changes', function(done) {
            // Set fake image with default 3 qualities
            var image = new mock.Image({
                availableQualities: [
                    osimis.quality.LOW,
                    osimis.quality.MEDIUM,
                    osimis.quality.LOSSLESS
                ]
            });
            viewport.setImage(image);

            // Check downloaded images are not displayed
            assert.equal(viewport._CornerstoneViewportSynchronizer.sync.callCount, 0, 'sync shouldn\'t have been called yet');

            // Jump to downloaded state using setTimout (as all promises as been mocked to return in 0ms)
            // @note Throw in promises will no be raised..
            setTimeout(function() {
                // Check the 3 binaries of the image have been sync
                assert.equal(viewport._CornerstoneViewportSynchronizer.sync.callCount, 3, 'sync should have been called 3 times');

                // Clean stuffs
                viewport.destroy();

                done();
            }, 0);
        });

        it('(USR-0510, UT0503) shall synchronize cornerstone viewport annotations when resolution changes', function(done) {
            // Set fake image with default 3 qualities
            var image = new mock.Image({
                availableQualities: [
                    osimis.quality.LOW,
                    osimis.quality.MEDIUM,
                    osimis.quality.LOSSLESS
                ],
                annotations: {
                    'length': {
                            "data": [{
                                "visible": true,
                                "active": false,
                                "handles": {
                                    "start": {
                                        "x": 244.81839080459767,
                                        "y": 134.76781609195393,
                                        "highlight": true,
                                        "active": false
                                    },
                                    "end": {
                                        "x": 203.62298850574712,
                                        "y": 223.0436781609194,
                                        "highlight": true,
                                        "active": false
                                    },
                                    "textBox": {
                                        "active": false,
                                        "hasMoved": false,
                                        "movesIndependently": false,
                                        "drawnIndependently": true,
                                        "allowedOutsideImage": true,
                                        "hasBoundingBox": true,
                                        "x": 244.81839080459767,
                                        "y": 134.76781609195393,
                                        "boundingBox": {
                                            "width": 76.6943359375,
                                            "height": 25,
                                            "left": 217.99999999999997,
                                            "top": 464.49999999999994
                                       }
                                    }
                                },
                                "length": 43.76066013984797,
                                "invalidated": true
                            }]
                    }
                }
            });
            viewport.setImage(image);

            // Check downloaded images are not displayed
            assert.equal(viewport._CornerstoneAnnotationSynchronizer.syncByAnnotationType.callCount, 0, 'sync shouldn\'t have been called yet');

            // Jump to downloaded state using setTimout (as all promises as been mocked to return in 0ms)
            // @note Throw in promises will no be raised..
            setTimeout(function() {
                // Check the 3 binaries of the image have been sync
                assert.equal(viewport._CornerstoneAnnotationSynchronizer.syncByAnnotationType.callCount, 3, 'sync should have been called 3 times');

                // Clean stuffs
                viewport.destroy();

                done();
            }, 0);
        });

        xit('(USR-0509, UT0504) shall keep windowing by default', function() {

        });

        xit('(USR-0509, UT0505) shall reset windowing when specified', function() {

        });

    });
});
