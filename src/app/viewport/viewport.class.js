/**
 * @ngdoc object
 * @memberOf osimis
 *
 * @name osimis.Viewport
 *
 * @description
 * Wrapper on top of cornerstone:
 * - work with progressive image loading
 *
 * # @rationale
 * Should be the easiest possible class to manage a viewport.
 */
(function(osimis, Promise) {

    /**
     * @ngdoc method
     * @methodOf osimis
     *
     * @constructor osimis.Viewport
     * @name osimis.Viewport
     * @param {DOMElement} domElement The div that will contains the canvas
     * @param {boolean} [isDiagnosisViewport=true] The
     */
    function Viewport(
        Promise, cornerstone,
        domElement, isDiagnosisViewport,
        wvReferenceLines
    ) {
        // Dependencies
        this._Promise = Promise;
        this._cornerstone = cornerstone;
        this._CornerstoneAnnotationSynchronizer = new osimis.CornerstoneAnnotationSynchronizer();
        this._CornerstoneViewportSynchronizer = new osimis.CornerstoneViewportSynchronizer();
        this._wvReferenceLines = wvReferenceLines;

        // Params
        this._enabledElement = domElement;
        isDiagnosisViewport = (typeof isDiagnosisViewport !== 'undefined') ? isDiagnosisViewport : true;

        // Fit image to the viewport by default
        this._fitImageToViewport = true;

        this._windowingMode = "image"; // per default, each image has its own windowing

        // Other stuffs
        // @deprecated?
        this._currentImage = null;
        this._currentImageResolution = null; // resolution === quality

        // Stored to be able to abort loading when image change.
        this._progressiveImageLoader = null;

        // Initialize cornerstone (and canvas)
        cornerstone.enable(this._enabledElement);
        this._enabledElementObject = cornerstone.getEnabledElement(this._enabledElement); // enabledElementObject != enabledElementDom
        this._canvas = $(this._enabledElementObject.canvas);

        // Set quality policy
        if (isDiagnosisViewport) {
            this._qualityPolicy = osimis.QualityForDiagnosis;
            $(this._enabledElement).on('CornerstoneImageRendered', function(e, eventData) {wvReferenceLines.onImageRendered(e, eventData);});
          }
        else {
            this._qualityPolicy = osimis.QualityForThumbnail;
        }

        // Sync annotation resolution only for diagnosis viewport. We must do
        // this as Cornerstone only handle annotation by image id instead of
        // via viewport and don't handle multi image resolution. Thus, if we
        // let for instance thumbnails sync annotation resolution, as they may
        // use a different resolution than diagnosis viewports, they will make
        // the annotation go out of sync with diagnosis viewport! Hopefully,
        // only diagnosis viewport should display annotation.
        if (isDiagnosisViewport) {
            this._syncAnnotationResolution = true;
        } else {
            this._syncAnnotationResolution = false;
        }
        // Set it up in cornerstone so we can easily patch the cornerstone
        // toolStateManager.
        this._enabledElementObject._syncAnnotationResolution = this._syncAnnotationResolution;

        // Taken from old viewport

        // Used for instance by tools to retrieve image annotations - or by pixel to mm conversion (used by tools as well)
        this._displayedImage = null;

        // Stored to scale the image based on it and to load the most adapted image resolution
        this._canvasWidth = null;
        this._canvasHeight = null;

        // Used by #reset method to fit image in the viewport as it need
        // the true height/width
        this._displayedCornerstoneImageObject = null;

        // Store viewport data (since the image may not be yet loaded at the
        // moment and cornerstone#setViewport requires the image to be set).
        this._viewportData = undefined;

        // Trigger onImageChanging prior to image drawing
        // but after the viewport data is updated
        // Used for instance by tools to set the canvas image annotations prior to the drawing
        this.onImageChanging = new osimis.Listener();

        // Used for instance by tools on first image shown on viewport to configure cornerstone
        this.onImageChanged = new osimis.Listener();

        // Used by tools to override the default viewport data
        // For instance, invert-contrast tool switch the default viewportData.invert to true when active
        this.onParametersResetting = new osimis.Listener();
    }

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#destroy
     *
     * @description
     * Disable cornerstone enabled element.
     * Close listeners.
     * Abort current images' loadings.
     */
    Viewport.prototype.destroy = function() {
        var cornerstone = this._cornerstone;

        // Make sure the previous image's download is aborted
        this.clearImage();
        this._displayedImage = null;

        // Free listeners
        this.onImageChanging.close();
        this.onImageChanged.close();
        this.onParametersResetting.close();

        // Disable cornerstone
        cornerstone.disable(this._enabledElement);
    }

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#getEnabledElement
     * @return {DOMElement} cornerstone enabled element
     *
     * @description
     * Used by extensions.
     */
    Viewport.prototype.getEnabledElement = function() {
        return this._enabledElement;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#getImage
     * @return {osimis.Image} Displayed image.
     *
     * @description
     * Used by tools to retrieve an image (and its annotations).
     */
    Viewport.prototype.getImage = function() {
        return this._displayedImage;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#draw
     *
     * @param {boolean} [invalidate=false]
     * Redraw the image. To set to true when we did change the
     * cornerstoneImageObject as cornerstone cache it.
     * warning: setting this to false when switching from viewports w/ the same
     * image may lead to unexpected behaviors.
     *
     * @description
     * Draw the image. Mostly used internally. Can sometimes be used by tool
     * also.
     */
    Viewport.prototype.draw = function(invalidate) {
        var cornerstone = this._cornerstone;
        var enabledElement = this._enabledElement;
        var enabledElementObject = this._enabledElementObject;

        // Ignore drawing if the image is not loaded yet. This can happen for
        // instance when the viewport data are modified externally while the
        // image hasn't been loaded yet.
        if (!enabledElementObject.image) {
            return;
        }

        // Redraw the image - don't use cornerstone#displayImage because bugs
        // occurs (only when debugger is off) those issues may come from
        // changing the cornerstoneImageObject (cornerstone probably cache it).
        // Draw image & invalidate cornerstone cache (multiple viewport with
        // different resolution can be displayed at the same time)
        invalidate = typeof invalidate === 'undefined' ? true : invalidate;
        cornerstone.updateImage(enabledElement, invalidate);
        $(enabledElement).trigger("CornerstoneImageRendered", {
            viewport: enabledElementObject.viewport,
            element : enabledElementObject.element,
            image : enabledElementObject.image,
            enabledElement : enabledElementObject,
            canvasContext: enabledElementObject.canvas.getContext('2d')
        });
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#setImage
     * @param {osimis.Image} image Image model
     * @param {boolean} [resetParameters] Reset the viewport parameters
     *   (ie. zoom, ...), mostly call when the end-user changes the series.
     *
     * @description
     * Change the displayed image.
     * Binaries will automaticaly be downloaded and displayed.
     */
    Viewport.prototype.setImage = function(image, resetViewport) {
        var cornerstone = this._cornerstone;
        var CornerstoneAnnotationSynchronizer = this._CornerstoneAnnotationSynchronizer;
        var CornerstoneViewportSynchronizer = this._CornerstoneViewportSynchronizer;
        var enabledElementObject = this._enabledElementObject;
        var enabledElement = this._enabledElement;
        var canvas = this._canvas;
        var _this = this;

        this._windowingMode = "image"; // each time we load a new series, we get back to the image by image windowing

        resetViewport = resetViewport || false;

        // Abort previous image downloads
        if (this._progressiveImageLoader) {
            this._progressiveImageLoader.destroy();
            this._progressiveImageLoader = null;
        }

        // Make sure the viewport is displayed
        // canvas.css('visibility', 'visible');

        // Load the new image's binaries (according to the defined quality policy)
        var qualities = this._qualityPolicy(image);
        this._progressiveImageLoader = new osimis.ProgressiveImageLoader(this._Promise, image, qualities);
        this._progressiveImageLoader.loadBinaries();

        // Display the binaries when they loads (eg. triggered 3 times if 3 qualities for one image)
        var _firstLoadingResolution = true;
        var _oldResolution = undefined;
        this._progressiveImageLoader.onBinaryLoaded(this, function(quality, csImageObject) {
            var oldImage = _this._displayedImage;
            var newImage = image;
            var oldResolution = _oldResolution || null;

            // Update cached resolution to new values
            _oldResolution = _.cloneDeep({
                width: csImageObject.width,
                height: csImageObject.height
            });

            // Change binary/pixels
            enabledElementObject.image = csImageObject;

            // Register new binary model (cornerstone image object)
            // Used by #reset method to fit image in the viewport as it need
            // the true height/width
            _this._displayedCornerstoneImageObject = csImageObject;

            // Register new image
            // Used for instance by tools to retrieve image annotations - or by
            // pixel to mm conversion (used by tools as well)
            _this._displayedImage = newImage;

            // Do stuffs required only when the first resolution is being
            // loaded (cf. reset, etc.)
            if (_firstLoadingResolution) {
                // Force canvas reset if the viewportData are not defined
                // already (if an image was previously shown in this viewport,
                // the viewport data from the old image are kept, not reset!)
                resetViewport = resetViewport || !_this._viewportData;

                // Either keep old parameters from the previous image or clear
                // them
                if (resetViewport) {
                    _this.reset();
                }
                // Sync the cs viewport object to the one stored if it is not
                // yet defined.
                else if (!_this._enabledElementObject.viewport || !_this._enabledElement.viewport) {
                    _this._enabledElementObject.viewport = _this._viewportData; // viewport data is set otherwise #reset would have been called
                    _this._enabledElement.viewport = _this._viewportData;
                }
            }

            // Adapt data (annotation & viewport parameter). It should only been done in some case (ie. no
            // need to adapt cornerstone viewport when resolution doesn't change). For convenience, these conditions
            // are handled within the synchronizer themselfs.
            var newResolution = _.cloneDeep({
                width: csImageObject.width,
                height: csImageObject.height
            });

            // Commit cornerstoneTools interactions (because internal cursor positions are cached
            // and based upon previous resolution).
            // @note Probably not possible
            // @todo Commit cornerstoneTools interactions

            // Adapt cornerstone viewport parameters. This shouldn't be done if viewport
            // has been reset since the reset method already does the sync.
            var csViewportData = _this._viewportData;
            // Dunno why we have to do this, but we have!
            _this._enabledElementObject.viewport = csViewportData; // viewport data is set otherwise #reset would have been called
            _this._enabledElement.viewport = csViewportData;

            // Track a displayed zone if it exists.
            // @todo merge with `osimis.CornerstoneViewportWrapper` class.
            if (_firstLoadingResolution && csViewportData._trackImageZone) {
                // Fit old bounding boxes into new canvas.
                csViewportData._displayImageZone(csViewportData._trackImageZone, _this._canvasWidth, _this._canvasHeight)
            }

            csViewportData.changeResolution(newResolution);

            // Adapt annotations' resolution for now (even if the following
            // syntax says otherwise). It means an annotation must only be
            // shown at a single resolution for all the viewports at a time,
            // otherwise bug will occurs. In practise this is the case.
            if (_this._syncAnnotationResolution) {
                var annotations = newImage.getAnnotations();
                for (var tool in annotations) {
                    if (annotations.hasOwnProperty(tool)) {
                        var annotation = annotations[tool];
                        CornerstoneAnnotationSynchronizer.syncByAnnotationType(
                            annotation.type,
                            annotation.data,
                            _firstLoadingResolution ? null : oldResolution,
                            newResolution
                        );
                        newImage.setAnnotations(annotation.type, annotation.data);
                    }
                }
            }

            // Do stuffs required only when the first resolution is being loaded (cf. reset, etc.)
            if (_firstLoadingResolution) {
                // Trigger onImageChanging before drawing (so tools can do stuff prior to drawing)
                // but after the viewport data is updated
                // Used to avoid multiple useless consecutive redrawing with tool
                // Particulary when a new image is drawn and the tool has to apply to each image
                _this.onImageChanging.trigger(newImage, oldImage);
            }

            // Draw
            // _this.draw(_firstLoadingResolution?false:true);
            _this.draw(true);

            // Do stuffs required only when the first resolution is being loaded,
            // but after the image has been drawn
            if (_firstLoadingResolution) {
                // Make sure the viewport is displayed
                canvas.css('visibility', 'visible');

                // Trigger onImageChanged after drawing (so components can react to image change)
                _this.onImageChanged.trigger(newImage, oldImage);

                // Invalidate variable _firstLoadingResolution so next binaries don't redo stuffs
                // only needed at the image scope
                _firstLoadingResolution = false;
            }
        });

        // Forward loading errors
        this._progressiveImageLoader.onLoadingFailed(this, function(quality, err) {
            // @todo check if cancelled errors are forwarded as error?

            throw err;
        });
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#destroy
     *
     * @description
     * Abort the current image's loadings.
     * Hide the current image.
     */
    Viewport.prototype.clearImage = function() {
        var progressiveImageLoader = this._progressiveImageLoader
        var canvas = this._canvas;

        // Abort loading of the previous image (the image binary manager only
        // abort when it makes sense - see the related source code for more
        // information) and close related listeners.
        if (progressiveImageLoader) {
            // Close listeners (before abortion to ignore canceling).
            progressiveImageLoader.onBinaryLoaded.close();
            progressiveImageLoader.onLoadingFailed.close();

            // Abort loading.
            progressiveImageLoader.abortBinariesLoading();
            progressiveImageLoader = null;
        }

        // Hide viewport's image
        canvas.css('visibility', 'hidden');
        this._displayedImage = null;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#enableSelection
     * @param {callback} onSelectedCallback
     *
     *   Callback's parameters:
     *   * {osimis.Viewport} `viewport` Current viewport (this object).
     *
     * @description
     * allow tools to reacts to click on the viewport
     * # @todo move out ?
     */
    Viewport.prototype.enableSelection = function(onSelectedCallback) {
        var _this = this;

        if (this._onViewportSelectedCallback) {
            throw new Error("viewport selection already active");
        }

        this._onViewportSelectedCallback = function() {
            onSelectedCallback(_this);
        };

        $(this._enabledElement).on('click', this._onViewportSelectedCallback);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#disableSelection
     *
     * @description
     * see enableSelection
     */
    Viewport.prototype.disableSelection = function() {
        $(this._enabledElement).off('click', this._onViewportSelectedCallback);
        this._onViewportSelectedCallback = null;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#getViewportData
     * @return {object} Return cornerstone viewport data (see cornerstone doc).
     *
     * @description
     */
    Viewport.prototype.getViewportData = function() {
        // Do not use cornerstone#getViewport directly as it copies the viewport
        // data, into a new object - thus, breaking the osimis' cornerstone
        // viewport data abstraction. We thus have rewrap it again.
        return this._viewportData && this._viewportData.clone();
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#getCurrentImageMinPixelValue
     *
     * @return {number}
     * The minimum pixel value of the current image.
     *
     * @description
     * This method return the minimum pixel value (in term of color shade) of
     * the current image. It is used by the windowing tool to fine-tune its
     * sensitivity.
     */
    Viewport.prototype.getCurrentImageMinPixelValue = function() {
        if (this._displayedCornerstoneImageObject.slope !== undefined && this._displayedCornerstoneImageObject.intercept !== undefined)
        {
            return this._displayedCornerstoneImageObject.minPixelValue * this._displayedCornerstoneImageObject.slope + this._displayedCornerstoneImageObject.intercept;
        }
        else
        {
            return this._displayedCornerstoneImageObject.minPixelValue;
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#getCurrentImageMaxPixelValue
     *
     * @return {number}
     * The maximum pixel value of the current image.
     *
     * @description
     * This method return the maximum pixel value (in term of color shade) of
     * the current image. It is used by the windowing tool to fine-tune its
     * sensitivity.
     */
    Viewport.prototype.getCurrentImageMaxPixelValue = function() {
        if (this._displayedCornerstoneImageObject.slope !== undefined && this._displayedCornerstoneImageObject.intercept !== undefined)
        {
            return this._displayedCornerstoneImageObject.maxPixelValue * this._displayedCornerstoneImageObject.slope + this._displayedCornerstoneImageObject.intercept;
        }
        else
        {
            return this._displayedCornerstoneImageObject.maxPixelValue;
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#setViewport
     * @param {object} viewportData Set cornerstone viewport data (see
     *                              cornerstone doc).
     *
     * @description
     * # @todo abstract from cornerstone
     */
    Viewport.prototype.setViewport = function(viewportData, imageWindowCenter, imageWindowWidth) {
        // Assert viewportData is a wrapped viewport data, not the cornestone
        // one.
        if (viewportData.constructor !== osimis.CornerstoneViewportWrapper) {
            throw new Error('setViewport called with non wrapped viewport');
        }

        if (viewportData.voi.hasModifiedWindowing !== undefined && viewportData.voi.hasModifiedWindowing) { // we are changing the windowing manually, keep this windowing for the whole series (WVP-169)
            this._windowingMode = "series";
        }
        else if (imageWindowCenter !== undefined && imageWindowWidth !== undefined && this._windowingMode == "image" && (viewportData)) {
            // we changed the image that might have another windowing as the previous image
            var windowCenters = imageWindowCenter.split('\\');
            var windowWidths = imageWindowWidth.split('\\');

            // Only take the first ww/wc available, ignore others (if
            // there is any).
            windowCenter = +windowCenters[0] || 127.5;
            windowWidth = +windowWidths[0] || 256;

            viewportData.voi.windowCenter = windowCenter;
            viewportData.voi.windowWidth = windowWidth;
        }

        // Make sure to adapt wrapped viewport's current image resolution to
        // the current image resolution, for instance if data are comming from
        // the external world. Note in those case, the method's user should
        // make sure setViewport is used after set image has been loaded,
        // otherwise the new viewport will apply to the current image.
        if (this._displayedCornerstoneImageObject) {
            var newResolution = {
                width: this._displayedCornerstoneImageObject.width,
                height: this._displayedCornerstoneImageObject.height
            };
            viewportData.changeResolution(newResolution);
        }

        // Store viewport data (since the image may not be yet loaded at the
        // moment and cornerstone#setViewport requires the image to be set).
        this._viewportData = viewportData;

        // Store the viewport wrapper directly in cornerstone to make sure
        // cornerstone uses the wrapper object instead of its original
        // object.
        this._enabledElement.viewport = viewportData;
        this._enabledElementObject.viewport = viewportData;

        // @note If the image is not yet displayed, this._viewportData will
        // be used once it is. See `#setImage` method.
        // We shouldn't use cornerstone#setViewport as it triggers a draw.
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#reset
     *
     * @description
     * Reset viewports options (zoom, windowing, pan, ...)
     * Keep the same image and annotation.
     *
     * Fit the image in the canvas.
     *
     * Need #draw() to be called after.
     */
    Viewport.prototype.reset = function() {
        var enabledElement = this._enabledElement;
        var cornerstoneImageObject = this._displayedCornerstoneImageObject;

        // Get the base viewport data
        var viewportData = cornerstone.getDefaultViewportForImage(
            enabledElement,
            cornerstoneImageObject
        );

        // Wrap viewportData in an osimis class handling image resolution
        // change. We'll configure it as if the image was in full resolution,
        // even if it's not always the case. We'll therefore be able to perform
        // resizing calculation based on full resolution information, and do
        // the resolution conversion afterward.
        var baseResolution = {
            width: cornerstoneImageObject.originalWidth,
            height: cornerstoneImageObject.originalHeight
        };
        viewportData = osimis.CornerstoneViewportWrapper.wrapCornerstoneViewport(
            viewportData,
            baseResolution,
            baseResolution,
            null,
            null,
            null
        );

        // Keep original image size if image is smaller than viewport if
        // viewport is configured to work as such
        var isImageSmallerThanViewport = baseResolution.width <= this._canvasWidth && baseResolution.height <= this._canvasHeight;
        if (!this._fitImageToViewport && isImageSmallerThanViewport) {
            // Show the image at original full width/height
            viewportData.scale = 1.0;
        }
        // Downscale image if it is bigger than viewport
        else {
            // Choose the smallest between vertical and horizontal scale to show the entire image
            // (and not upscale one of the two)
            var verticalScale = this._canvasHeight / baseResolution.height;
            var horizontalScale = this._canvasWidth / baseResolution.width;
            if(horizontalScale < verticalScale) {
              viewportData.scale = horizontalScale;
            }
            else {
              viewportData.scale = verticalScale;
            }
        }

        // Sync viewportData from originalResolution (which is used to make the
        // calculations) to the current image resolution.
        var newResolution = {
            width: cornerstoneImageObject.width,
            height: cornerstoneImageObject.height
        };
        viewportData.changeResolution(newResolution);

        // Replace the viewport data in cornerstone (without redrawing, yet)
        var enabledElementObject = this._enabledElementObject; // enabledElementObject != enabledElementDom
        enabledElementObject.viewport = viewportData;
        this._enabledElement.viewport = viewportData;

        // Update the cached viewportData
        this._viewportData = viewportData;

        // allow extensions to extend this behavior
        // Used by invert tool to redefine inversion on viewport reset
        this.onParametersResetting.trigger(viewportData);

        // Method's user has to call .draw to avoid dual image redrawing.
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#getCanvasSize
     *
     * @return {object}
     * An object with info about the canvas size.
     *
     * * {int} `width` canvas width (in pixel).
     * * {int} `height` canvas height (in pixel).
     *
     * @description
     * Retrieve the current canvas size. As those values are cached, no reflow
     * is triggered.
     */
    Viewport.prototype.getCanvasSize = function() {
        return {
            width: this._canvasWidth,
            height: this._canvasHeight
        }
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Viewport
     *
     * @name osimis.Viewport#resizeCanvas
     *
     * @param {int} width
     * New canvas width (in pixel).
     *
     * @param {int} height
     * New canvas height (in pixel).
     *
     * @description
     * Resize cornerstone canvas.
     * Must be called when the windows is resized for instance, or when the
     * layout change.
     *
     * Need `#draw` to be called after.
     */
    Viewport.prototype.resizeCanvas = function(newCanvasWidth, newCanvasHeight) {
        var enabledElement = this._enabledElement;
        //unit = unit || "px";
        // Retrieve previous canvas size
        var oldCanvasWidth = this._canvasWidth;
        var oldCanvasHeight = this._canvasHeight;

        // Cache canvas size for later
        // (eg. to know if an image is larger than its viewport)
        this._canvasWidth = newCanvasWidth;
        this._canvasHeight = newCanvasHeight;

        // Set the canvas size / pixel quantity.
        // We don't use `cornerstone.resize` since it sets its canvas size
        // based on the canvas' parent element size. For safety, we want to
        // rely on this method's parameters instead.
        var canvas = this._enabledElementObject.canvas;
        canvas.width = newCanvasWidth; //+ unit;
        canvas.height = newCanvasHeight; //+ unit;
        canvas.style.width = newCanvasWidth + "px";
        canvas.style.height = newCanvasHeight + "px";

        // Scale the image to the new canvas size
        this.displayImageZone(oldCanvasWidth, oldCanvasHeight);

        // We expect method's user to call #draw after.
    };

    Viewport.prototype.displayImageZone = function(oldWidth, oldHeight){
        if (this._viewportData) {
            // Retrieve bounding boxes from old canvas.
            var displayedImageZone = this._viewportData._trackImageZone || this._viewportData._getDisplayedImageZone(
                oldWidth,
                oldHeight
            );

            // Fit old bounding boxes into new canvas.
            this._viewportData._displayImageZone(displayedImageZone, this._canvasWidth, this._canvasHeight);
        }
    }

    osimis.Viewport = Viewport;

})(this.osimis || (this.osimis = {}), this.Promise);
