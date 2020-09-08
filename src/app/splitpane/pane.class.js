/**
 * @ngdoc object
 * @memberOf osimis
 *
 * @name osimis.Pane
 *
 * @description
 * The `Pane` class is used to represent the content of a pane. A pane can
 * either contain:
 *
 * - a video.
 * - a (PDF) report.
 * - a series of images.
 *
 * When the pane contains a series of image, the model also store which image
 * is being viewed within the series, and the state of the viewport (ww/wc,
 * ...), so the pane can be shared across network as is (ie. via liveshare) or
 * stored.
 */
(function(osimis) {
    'use strict';

    function Pane($timeout, Promise, studyManager, seriesManager, x, y, wvConfig) {
        // Injections
        this._Promise = Promise;
        this._studyManager = studyManager;
        this._seriesManager = seriesManager;
        this._wvConfig = wvConfig;
        this.$timeout = $timeout;

        // @warning This parameter is used for other services to access the
        // series model. As the series manager is ill-formed and always create
        // a new series model on `.get` call, this variable is filled within
        // the webviewer directive declarative code, as it is currently the
        // only way to retrieve it. We should split the series model and be
        // able to retrieve the local/pane-dependant series
        // controller/navigator split from the global/cached series model.
        this.series = undefined;

        // Position of the pane
        this.x = x;
        this.y = y;

        this.seriesId = undefined;
        this.csViewport = undefined;
        // this.viewportModel = undefined;
        this.imageIndex = undefined;
        this.reportId = undefined;
        this.videoId = undefined;
        this.isSelected = false;
        this.isHovered = false;
        this.studyColor = undefined;
    }

    /**
     * @ngdoc method
     * @methodOf osimis.Pane
     *
     * @name osimis.Pane#isEmpty
     *
     * @return {boolean}
     * True if the pane has no content. False if the pane as contains either:
     *
     * * a video
     * * a series
     * * a pdf
     *
     * @description
     * Check if the current pane has no content.
     */
    Pane.prototype.isEmpty = function() {
        return !this.seriesId && !this.videoId && !this.reportId;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Pane
     *
     * @name osimis.Pane#getStudy
     *
     * @return {Promise<osimis.Study>}
     * Return a Promise with `undefined` value if the pane is empty, or the
     * study related to the inner content.
     */
    Pane.prototype.getStudy = function() {
        var Promise = this._Promise;
        var studyManager = this._studyManager;

        // Return undefined if the pane contians nothing.
        if (this.isEmpty()) {
            return Promise.when(undefined);
        }
        else if (this.seriesId) {
            return studyManager
                .getBySeriesId(this.seriesId);
        }
        else if (this.videoId) {
            return studyManager
                .getByInstanceId(this.videoId);
        }
        else if (this.reportId) {
            return studyManager
                .getByInstanceId(this.reportId);
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Pane
     *
     * @name osimis.Pane#getImage
     *
     * @return {Promise<osimis.Image>}
     * Return a Promise with `undefined` value if the pane does not contain
     * an image, or the image contained in the pane.
     */
    Pane.prototype.getImage = function() {
        var Promise = this._Promise;
        var seriesManager = this._seriesManager;
        var seriesId = this.seriesId;
        var imageIndex = this.imageIndex;

        // Return an empty promise if the pane does
        // not contains an image.
        if (!seriesId) {
            return Promise.when(undefined);
        }

        // Return a promise of the image otherwise.
        return Promise
            // Retrieve the series.
            .when(seriesManager.get(seriesId))
            // Retrieve the iamage
            .then(function(series) {
                return series.getImageByIndex(imageIndex);
            });
    };

    Pane.prototype.isAtPosition = function(x, y) {
        return this.x === x && this.y === y;
    };

    Pane.prototype.getPosition = function() {
        return {'x' : this.x, 'y' : this.y};
    };

    Pane.prototype.applyWindowing = function(windowWidth, windowCenter) {
        // Apply windowing.
        this.csViewport.voi.windowWidth = windowWidth;
        this.csViewport.voi.windowCenter = windowCenter;
        this.csViewport.voi.hasModifiedWindowing = true; // windowing has been modified manually
    };

    Pane.prototype.applyEmbeddedWindowingPreset = function(presetsIndex) {
        var _this = this;
        this.getEmbeddedWindowingPresetsPromise().then(function(windowingPresets) {
            if (!(presetsIndex in windowingPresets)) {
                console.log("no windowing presets defined in DICOM file for index ", presetsIndex);
            } else {
                _this.applyWindowing(windowingPresets[presetsIndex].windowWidth, windowingPresets[presetsIndex].windowCenter);
            }
        });
    };

    Pane.prototype.applyConfigWindowingPreset = function(presetsIndex) {
        if (!(presetsIndex in this._wvConfig.config.windowingPresets)) {
            console.log("no windowing presets defined in config file for index ", presetsIndex);
        } else {
            var _this = this;
            this.$timeout(function() { // don't know why but, if applyWindowing is called synchronously, changes are not applied
                _this.applyWindowing(_this._wvConfig.config.windowingPresets[presetsIndex].windowWidth, _this._wvConfig.config.windowingPresets[presetsIndex].windowCenter);
            }, 1);

        }
    };

    Pane.prototype.rotateLeft = function() {
        this.csViewport.rotation = this.csViewport.rotation - 90;
    };

    Pane.prototype.rotateRight = function() {
        this.csViewport.rotation = this.csViewport.rotation + 90;
    };

    Pane.prototype.flipVertical = function() {
        this.csViewport.vflip = !this.csViewport.vflip;
    };

    Pane.prototype.flipHorizontal = function() {
        this.csViewport.hflip = !this.csViewport.hflip;
    };

    Pane.prototype.invertColor = function() {
        this.csViewport.invert = !this.csViewport.invert;
    };

    Pane.prototype.downloadAsJpeg = function(wvImageManager) {
        var that = this;
        var serializedCsViewport = this.csViewport.serialize(this.csViewport.originalImageResolution.width, this.csViewport.originalImageResolution.height);
        var imageId = this.series.imageIds[this.imageIndex];

        return wvImageManager.get(imageId).then(function(image){
            var captureWidth = image.instanceInfos.TagsSubset["Columns"] || 600;
            var captureHeight = image.instanceInfos.TagsSubset["Rows"] || 400;

            if (captureWidth < 512) { // if image is too small, the annotation will appear 'pixelized' -> increase the size
                var upscaleRatio = 512 / captureWidth;
                captureWidth = Math.round(captureWidth * upscaleRatio);
                captureHeight = Math.round(captureHeight * upscaleRatio);
            }

            console.log("creating a new capture image (" + captureWidth + " x " + captureHeight + ")");

            wvImageManager
                .createAnnotedImage(imageId, captureWidth, captureHeight, serializedCsViewport, "image/jpeg", false, 0.8)
                .then(function(imageData) {
                    console.log("Downloading image (" + imageData.length + " bytes)");

                    // convert the data uri to blob
                    var binaryImageData = atob(imageData.split(',')[1]);
                    var array = [];
                    for(var i = 0; i < binaryImageData.length; i++)
                        array.push(binaryImageData.charCodeAt(i));
                    var blob = new Blob([new Uint8Array(array)], {type: "image/jpeg"});

                    var url = window.URL.createObjectURL(blob);

                    var element = document.createElement('a');
                    //element.setAttribute('href', imageData);
                    element.setAttribute('href', url);
                    element.setAttribute('download', that.series.tags["PatientName"] + " - " + that.series.tags["StudyDescription"] + " - " + that.series.tags["SeriesDescription"] + ".jpg");

                    element.style.display = 'none';
                    document.body.appendChild(element);

                    element.click();

                    document.body.removeChild(element);
                });
        });

    }

    Pane.prototype.getNextSeriesPaneConfigPromise = function(){
        var selectedPane = this;
        var Promise = this._Promise;

        return selectedPane.getStudy().then(function(study){
            var currentItemId = selectedPane.seriesId || selectedPane.videoId || selectedPane.reportId,
                nextItemTuple = study.getNextItemId(currentItemId);

            var config = {};
            if(nextItemTuple[1] == "series"){
                config.seriesId = nextItemTuple[0];
            }else if(nextItemTuple[1] == "video"){
                config.videoId = nextItemTuple[0];
            }else {
                config.reportId = nextItemTuple[0];
            }

            return Promise.when(config);
        });
    };

    Pane.prototype.getPreviousSeriesPaneConfigPromise = function(){
        var selectedPane = this;
        var Promise = this._Promise;

        return selectedPane.getStudy().then(function(study){
            var currentItemId = selectedPane.seriesId || selectedPane.videoId || selectedPane.reportId,
                nextItemTuple = study.getPreviousItemId(currentItemId);

            var config = {};
            if(nextItemTuple[1] == "series"){
                config.seriesId = nextItemTuple[0];
            }else if(nextItemTuple[1] == "video"){
                config.videoId = nextItemTuple[0];
            }else {
                config.reportId = nextItemTuple[0];
            }

            return Promise.when(config);
        });
    };

    Pane.prototype.getEmbeddedWindowingPresetsPromise = function() {
        var Promise = this._Promise;

        return this.getImage()
        .then(function(image) {
            // Ignore if the selected viewport doesn't contain an image.
            if (!image) {
                return;
            }

            // Get default windowing (either set via a dicom tag or processed in a
            // web worker just after the image is downloaded).
            return Promise.all([
                Promise.when(image), // first element of the returnee is the image
                image
                    .getBestBinaryInCache()
                    .then(function(imageBinary) {
                        // Ignore if no image binary has been loaded yet.
                        if (!imageBinary) {
                            return;
                        }

                        // Return default windowing.
                        return { // second element of the returnee is the windowing center
                            windowCenter: +imageBinary.windowCenter,
                            windowWidth: +imageBinary.windowWidth
                        };
                    })
            ]);
        })
        .then(function(result) {
            // Ignore selected pane without images.
            if (!result || result.length < 1) {
                return Promise.when([]);
            }

            var image = result[0];
            var defaultWindowing = result[1];

            // Process windowing presets inside dicom.
            var windowCenters = image.instanceInfos.TagsSubset.WindowCenter && image.instanceInfos.TagsSubset.WindowCenter.split('\\');
            var windowWidths = image.instanceInfos.TagsSubset.WindowWidth && image.instanceInfos.TagsSubset.WindowWidth.split('\\');

            // Ignore method if there is no windowing tag.
            if (!windowCenters || !windowWidths) {
                return Promise.when([]);
            }

            // Assert there are as many window width preset than window center ones.
            if (windowCenters.length !== windowWidths.length) {
                throw new Error('WindowWidth DICOM tags doesn\'t fit WindowCenter one.');
            }

            // Merge windowCenters and windowWidths arrays in a single one.
            var embeddedWindowings = windowCenters
                .map(function(windowCenter, index) {
                    return {
                        windowCenter: +windowCenter,
                        windowWidth: +windowWidths[index]
                    }
                });

            // Push default windowing in front.
            if (defaultWindowing) {
                embeddedWindowings = [
                    defaultWindowing
                ].concat(embeddedWindowings);
            }
            else {
                // This happens only when no binary has been loaded yet. In this case,
                // we only show windowing as set in the dicom file.
            }

            // Remove duplicates (this happens for instance when the default windowing has been
            // retrieved from the dicom tags).
            embeddedWindowings = _.uniqWith(embeddedWindowings, _.isEqual);
            return Promise.when(embeddedWindowings);
        });
    };


    osimis.Pane = Pane;

})(this.osimis || (this.osimis = {}));
