describe('progressive image loading', function() {

    describe('(U01) CornerstoneAnnotationSynchronizer class', function() {

        var CornerstoneAnnotationSynchronizer;
        var lengthAnnotations;
        var angleAnnotations;
        var probeAnnotations;
        var ellipticalRoiAnnotations;
        var rectangleRoiAnnotations;

        beforeEach(function() {
            // Create synchronizer instance
            CornerstoneAnnotationSynchronizer = new osimis.CornerstoneAnnotationSynchronizer();
        });

        // Each fellow beforeEach section mock cornerstone annotations samples.
        // Each of the following variable can contains multiple 
        // annotations of one tool, for one specific imageId.
        
        describe('Length annotation', function() {

            beforeEach(function() {
                lengthAnnotations = {
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
                };
            });

            it('(USR-0510, UT0101) shall store the resolution in the annotations,\
                so we can sync them to another resolution when we load them',
            function() {
                // Check resolution is not stored yet
                var data = lengthAnnotations.data[0];
                assert.equal(data.imageResolution, undefined, "Annotation\'s image \
                    resolution is not stored by cornerstone");

                // Sync resolution for the first time
                var baseResolution = undefined;
                var newResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('length', lengthAnnotations, baseResolution, newResolution);

                // Check resolution has been stored
                assert.deepEqual(data.imageResolution, {
                    width: 150,
                    height: 150
                }, "Annotation\'s image resolution should be stored");
            });

            it('(USR-0510, UT0102) shall convert the annotations to the current binary resolution\
                so annotations stay compatible with cornerstoneTools when resolution\
                changes',
            function() {
                var data = lengthAnnotations.data[0];

                // Sync resolution for the first time
                var baseResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('length', lengthAnnotations, undefined, baseResolution);

                // Check original values
                assert.closeTo(data.handles.start.x, 244, 2);
                assert.closeTo(data.handles.start.y, 134, 2);
                assert.closeTo(data.handles.end.x, 203, 2);
                assert.closeTo(data.handles.end.y, 223, 2);
                // @node Other pixel values doesn't look like they need to be converted

                // Sync annotations to new resolution
                var newResolution = {
                    width: 1000,
                    height: 1000
                };
                var originalHandles = _.cloneDeep(data.handles); // clone handles so we can compare
                var oldHandles = _.cloneDeep(data.handles); // clone handles so we can compare values
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('length', lengthAnnotations, baseResolution, newResolution);

                // Check synced values
                var resolutionDelta = newResolution.width / baseResolution.width;
                assert.closeTo(data.handles.start.x, oldHandles.start.x * resolutionDelta, 2);
                assert.closeTo(data.handles.start.y, oldHandles.start.y * resolutionDelta, 2);
                assert.closeTo(data.handles.end.x, oldHandles.end.x * resolutionDelta, 2);
                assert.closeTo(data.handles.end.y, oldHandles.end.y * resolutionDelta, 2);
            });
        });

        describe('Angle annotation', function() {

            beforeEach(function() {
                angleAnnotations = {
                    "data": [{
                        "visible": true,
                        "active": false,
                        "handles": {
                            "start": {
                                "x": 304.85517241379307,
                                "y": 280.1241379310344,
                                "highlight": true,
                                "active": false
                            },
                            "end": {
                                "x": 306.0229885057471,
                                "y": 203.03448275862058,
                                "highlight": true,
                                "active": false
                            },
                            "start2": {
                                "x": 304.85517241379307,
                                "y": 280.1241379310344,
                                "highlight": true,
                                "active": false
                            },
                            "end2": {
                                "x": 324.85517241379307,
                                "y": 290.1241379310344,
                                "highlight": true,
                                "active": false
                            }
                        },
                        "invalidated": true
                    }]
                };
            });

            it('(USR-0510, UT0103) shall store the resolution in the annotations,\
                so we can sync them to another resolution when we load them',
            function() {
                // Check resolution is not stored yet
                var data = angleAnnotations.data[0];
                assert.equal(data.imageResolution, undefined, "Annotation\'s image \
                    resolution is not stored by cornerstone");

                // Sync resolution for the first time
                var baseResolution = undefined;
                var newResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('angle', angleAnnotations, baseResolution, newResolution);

                // Check resolution has been stored
                assert.deepEqual(data.imageResolution, {
                    width: 150,
                    height: 150
                }, "Annotation\'s image resolution should be stored");
            });

            it('(USR-0510, UT0104) shall convert the annotations to the current binary resolution\
                so annotations stay compatible with cornerstoneTools when resolution\
                changes',
            function() {
                var data = angleAnnotations.data[0];

                // Sync resolution for the first time
                var baseResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('angle', angleAnnotations, undefined, baseResolution);

                // Check original values
                assert.closeTo(data.handles.start.x, 304, 2);
                assert.closeTo(data.handles.start.y, 280, 2);
                assert.closeTo(data.handles.end.x, 306, 2);
                assert.closeTo(data.handles.end.y, 203, 2);
                assert.closeTo(data.handles.start2.x, 306, 2);
                assert.closeTo(data.handles.start2.y, 280, 2);
                assert.closeTo(data.handles.end2.x, 324, 2);
                assert.closeTo(data.handles.end2.y, 290, 2);
                // @node Other pixel values doesn't look like they need to be converted
                
                // Sync annotations to new resolution
                var newResolution = {
                    width: 1000,
                    height: 1000
                };
                var oldHandles = _.cloneDeep(data.handles); // clone handles so we can compare values
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('angle', angleAnnotations, baseResolution, newResolution);

                // Check synced values
                var resolutionDelta = newResolution.width / baseResolution.width;
                assert.closeTo(data.handles.start.x, oldHandles.start.x * resolutionDelta, 2);
                assert.closeTo(data.handles.start.y, oldHandles.start.y * resolutionDelta, 2);
                assert.closeTo(data.handles.end.x, oldHandles.end.x * resolutionDelta, 2);
                assert.closeTo(data.handles.end.y, oldHandles.end.y * resolutionDelta, 2);
                assert.closeTo(data.handles.start2.x, oldHandles.start2.x * resolutionDelta, 2);
                assert.closeTo(data.handles.start2.y, oldHandles.start2.y * resolutionDelta, 2);
                assert.closeTo(data.handles.end2.x, oldHandles.end2.x * resolutionDelta, 2);
                assert.closeTo(data.handles.end2.y, oldHandles.end2.y * resolutionDelta, 2);
            });
        });

        describe('Rectangle ROI annotation', function() {

            beforeEach(function() {
                rectangleRoiAnnotations = {
                    "data": [{
                        "visible": true,
                        "active": true,
                        "handles": {
                            "start": {
                                "x": 130.648275862069,
                                "y": 161.83908045977012,
                                "highlight": true,
                                "active": false
                            },
                            "end": {
                                "x": 178.9057471264368,
                                "y": 214.80459770114942,
                                "highlight": true,
                                "active": false
                            }
                        },
                        "invalidated": true
                    }]
                };
            });

            it('(USR-0510, UT0105) shall store the resolution in the annotations,\
                so we can sync them to another resolution when we load them',
            function() {
                // Check resolution is not stored yet
                var data = rectangleRoiAnnotations.data[0];
                assert.equal(data.imageResolution, undefined, "Annotation\'s image \
                    resolution is not stored by cornerstone");

                // Sync resolution for the first time
                var baseResolution = undefined;
                var newResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('rectangleRoi', rectangleRoiAnnotations, baseResolution, newResolution);

                // Check resolution has been stored
                assert.deepEqual(data.imageResolution, {
                    width: 150,
                    height: 150
                }, "Annotation\'s image resolution should be stored");
            });

            it('(USR-0510, UT0106) shall convert the annotations to the current binary resolution\
                so annotations stay compatible with cornerstoneTools when resolution\
                changes',
            function() {
                var data = rectangleRoiAnnotations.data[0];

                // Sync resolution for the first time
                var baseResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('rectangleRoi', rectangleRoiAnnotations, undefined, baseResolution);

                // Check original values
                assert.closeTo(data.handles.start.x, 130, 2);
                assert.closeTo(data.handles.start.y, 161, 2);
                assert.closeTo(data.handles.end.x, 178, 2);
                assert.closeTo(data.handles.end.y, 214, 2);
                // @node Other pixel values doesn't look like they need to be converted
                
                // Sync annotations to new resolution
                var newResolution = {
                    width: 1000,
                    height: 1000
                };
                var oldHandles = _.cloneDeep(data.handles); // clone handles so we can compare values
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('rectangleRoi', rectangleRoiAnnotations, baseResolution, newResolution);

                // Check synced values
                var resolutionDelta = newResolution.width / baseResolution.width;
                assert.closeTo(data.handles.start.x, oldHandles.start.x * resolutionDelta, 2);
                assert.closeTo(data.handles.start.y, oldHandles.start.y * resolutionDelta, 2);
                assert.closeTo(data.handles.end.x, oldHandles.end.x * resolutionDelta, 2);
                assert.closeTo(data.handles.end.y, oldHandles.end.y * resolutionDelta, 2);
            });
        });

        describe('Elliptical ROI annotation', function() {
            beforeEach(function() {
                ellipticalRoiAnnotations = {
                    "data": [{
                        "visible": true,
                        "active": false,
                        "invalidated": false,
                        "handles": {
                            "start": {
                                "x": 208.3310344827586,
                                "y": 274.83218390804586,
                                "highlight": true,
                                "active": false
                            },
                            "end": {
                                "x": 260.11954022988505,
                                "y": 323.0896551724137,
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
                                "x": 260.11954022988505,
                                "y": 298.9609195402298,
                                "boundingBox": {
                                     "width": 130.05126953125,
                                     "height": 65,
                                     "left": 221,
                                     "top": 584
                                }
                            }
                        },
                        "meanStdDev": {
                            "count": 1961,
                            "mean": 237.23406425293217,
                            "variance": 16297.603041564464,
                            "stdDev": 127.66206578919387
                        },
                        "area": 396.0988419610515
                    }]
                };
            });

            it('(USR-0510, UT0107) shall store the resolution in the annotations,\
                so we can sync them to another resolution when we load them',
            function() {
                // Check resolution is not stored yet
                var data = ellipticalRoiAnnotations.data[0];
                assert.equal(data.imageResolution, undefined, "Annotation\'s image \
                    resolution is not stored by cornerstone");

                // Sync resolution for the first time
                var baseResolution = undefined;
                var newResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('ellipticalRoi', ellipticalRoiAnnotations, baseResolution, newResolution);

                // Check resolution has been stored
                assert.deepEqual(data.imageResolution, {
                    width: 150,
                    height: 150
                }, "Annotation\'s image resolution should be stored");
            });

            it('(USR-0510, UT0108) shall convert the annotations to the current binary resolution\
                so annotations stay compatible with cornerstoneTools when resolution\
                changes',
            function() {
                var data = ellipticalRoiAnnotations.data[0];

                // Sync resolution for the first time
                var baseResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('ellipticalRoi', ellipticalRoiAnnotations, undefined, baseResolution);

                // Check original values
                assert.closeTo(data.handles.start.x, 208, 2);
                assert.closeTo(data.handles.start.y, 274, 2);
                assert.closeTo(data.handles.end.x, 260, 2);
                assert.closeTo(data.handles.end.y, 323, 2);
                // @node Other pixel values doesn't look like they need to be converted
                
                // Sync annotations to new resolution
                var newResolution = {
                    width: 1000,
                    height: 1000
                };
                var oldHandles = _.cloneDeep(data.handles); // clone handles so we can compare values
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('ellipticalRoi', ellipticalRoiAnnotations, baseResolution, newResolution);

                // Check synced values
                var resolutionDelta = newResolution.width / baseResolution.width;
                assert.closeTo(data.handles.start.x, oldHandles.start.x * resolutionDelta, 2);
                assert.closeTo(data.handles.start.y, oldHandles.start.y * resolutionDelta, 2);
                assert.closeTo(data.handles.end.x, oldHandles.end.x * resolutionDelta, 2);
                assert.closeTo(data.handles.end.y, oldHandles.end.y * resolutionDelta, 2);
            });
        });

        describe('Probe annotation', function() {

            beforeEach(function() {
                probeAnnotations = {
                    "data": [{
                        "visible": true,
                        "active": false,
                        "handles": {
                            "end": {
                                    "x": 155.3655172413793,
                                    "y": 299.54942528735626,
                                    "highlight": true,
                                    "active": false
                            }
                        },
                        "invalidated": true
                    }]
                };
            });

            it('(USR-0510, UT0109) shall store the resolution in the annotations,\
                so we can sync them to another resolution when we load them',
            function() {
                // Check resolution is not stored yet
                var data = probeAnnotations.data[0];
                assert.equal(data.imageResolution, undefined, "Annotation\'s image \
                    resolution is not stored by cornerstone");

                // Sync resolution for the first time
                var baseResolution = undefined;
                var newResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('probe', probeAnnotations, baseResolution, newResolution);

                // Check resolution has been stored
                assert.deepEqual(data.imageResolution, {
                    width: 150,
                    height: 150
                }, "Annotation\'s image resolution should be stored");
            });

            it('(USR-0510, UT0110) shall convert the annotations to the current binary resolution\
                so annotations stay compatible with cornerstoneTools when resolution\
                changes',
            function() {
                var data = probeAnnotations.data[0];

                // Sync resolution for the first time
                var baseResolution = {
                    width: 150,
                    height: 150
                };
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('probe', probeAnnotations, undefined, baseResolution);

                // Check original values
                assert.closeTo(data.handles.end.x, 155, 2);
                assert.closeTo(data.handles.end.y, 299, 2);
                
                // Sync annotations to new resolution
                var newResolution = {
                    width: 1000,
                    height: 1000
                };
                var oldHandles = _.cloneDeep(data.handles); // clone handles so we can compare values
                CornerstoneAnnotationSynchronizer.syncByAnnotationType('probe', probeAnnotations, baseResolution, newResolution);

                // Check synced values
                var resolutionDelta = newResolution.width / baseResolution.width;
                assert.closeTo(data.handles.end.x, oldHandles.end.x * resolutionDelta, 2);
                assert.closeTo(data.handles.end.y, oldHandles.end.y * resolutionDelta, 2);
            });
        });

        xit('should break every tool\'s interaction when syncing\
            so the cornerstoneTools variables stay in sync with the resolution', 
        function() {

        });

    });
});