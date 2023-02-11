/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.CornerstoneViewportWrapper
 * 
 * @description 
 * This object wraps cornerstone viewport data object to handle progressive
 * image loading via multiple resolution. For conveniance, it keeps the initial
 * cornestone interface. Using Object#defineProperties is also the only way to
 * provide real time resolution conversion when cornerstone tools zoom/pan are 
 * being used but and the image resolution changes.
 * 
 * See `https://github.com/chafey/cornerstone/wiki/viewport` for the initial
 * CornerstoneJS viewport data object documentation.
 *
 * The only cornerstone methods that recreate a new viewport object are #reset,
 * #fitToWindow & #setCanvasSize (because both uses #reset). Therefore, those 
 * are the edge case we need to wrap outside this class. This is done in the
 * webviewer's viewport class.
 *
 * Warning: this object handles cornerstone viewport object's parameter
 * conversion for multi-resolution image loading. However, it doesn't handle 
 * the related annotation data's conversion.
 */
(function(osimis) {
    'use strict';

    function CornerstoneViewportWrapper(originalImageResolution, currentImageResolution, cornerstoneViewportData, canvasWidth, canvasHeight, trackedImageZone) {
        // Image resolution at full scale (the resolution from the dicom
        // pixeldata).
        this.originalImageResolution = originalImageResolution || {
            width: undefined,
            height: undefined
        };
        // The actual image resolution as currently loaded.
        this.currentImageResolution = currentImageResolution || {
            width: undefined,
            height: undefined
        };

        // Copy initial CornerstoneJS interface
        this._cornerstoneViewportData = cornerstoneViewportData || {
            scale: undefined, // resolution conversion will be done for this parameter
            translation: { // resolution conversion will be done for this parameter
                x: undefined,
                y: undefined
            },
            voi: {}, // not handled - left to cornerstone API
            invert: undefined,
            pixelReplication: undefined,
            hflip: undefined,
            vflip: undefined,
            rotation: undefined,
            modalityLUT: {}, // not handled - left to cornerstone API
            voiLUT: {} // not handled - left to cornerstone API
        };

        // Display this specific image zone on every window resize etc. The
        // tracking occurs within the `osimis.Viewport` class.
        // @todo merge with `osimis.Viewport` class. The value of this object
        // must follow the structure returend by the `_getDisplayedImageZone` method.
        this._trackImageZone = trackedImageZone || null;

        // Adapt cornerstoneViewportData to display tracked image zone based on
        // canvas dimensions. Not required if there is no tracked image zone.
        if (this._trackImageZone && canvasWidth && canvasHeight) {
            this._displayImageZone(this._trackImageZone, canvasWidth, canvasHeight);
        }

      }

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportWrapper
     * 
     * @name osimis.CornerstoneViewportWrapper#getScaleForFullResolution
     * 
     * @return {float}
     * The scale value converted to the full image resolution.
     * 
     * @description 
     * Provide the scale variable based on the full image resolution. The
     * overlay uses it to display a consistant scale even if the image 
     * resolution changes.
     */
    CornerstoneViewportWrapper.prototype.getScaleForFullResolution = function() {
        // Check out scale ratio between current res and original resolution.
        var scaleRatio = this.originalImageResolution.width / this.currentImageResolution.width;

        // We need to divide the scale by that ratio to compensate the change
        // (as `.scale` property is resolution dependant).
        var scaleForFullResolution = this._cornerstoneViewportData.scale / scaleRatio;

        return scaleForFullResolution;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportWrapper
     * 
     * @name osimis.CornerstoneViewportWrapper#clone
     * 
     * @return {osimis.CornerstoneViewportWrapper}
     * A clone of the current wrapper.
     * 
     * @description 
     * This method clone the current wrapper. It is mostly used to prevent
     * changes in the original one.
     */
    CornerstoneViewportWrapper.prototype.clone = function() {
        return osimis.CornerstoneViewportWrapper.wrapCornerstoneViewport(
            this._cornerstoneViewportData,
            this.originalImageResolution,
            this.currentImageResolution,
            
            // Do not clone `canvasWidth` & `canvasHeight`, as they are only
            // used to update cornerstone viewport data based on the tracked
            // image zone and are not saved). The will trigger recursive
            // $digest cycle if they're set though, as it will make the
            // cornerstone viewport data match the tracked image zone
            // recursively since the `clone` method is used inside a $watcher.
            null,
            null,
            this._trackImageZone
        );
    };

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportWrapper
     * 
     * @name osimis.CornerstoneViewportWrapper#serialize
     * 
     * @return {object}
     * The serialized viewport data object
     * 
     * @description 
     * Provide a serialized version of the viewport data. This version is
     * image resolution-independant, and can be used to store the data.
     */
    CornerstoneViewportWrapper.prototype.serialize = function(canvasWidth, canvasHeight) {
        // Consider ourself to max resolution.
        var oldResolution = this.currentImageResolution;
        this.changeResolution(this.originalImageResolution);

        // Create serialized object.
        var result = {
            imageId: this.imageId,
            // Clone data to make sure they wont be modified
            imageResolution: _.cloneDeep(this.originalImageResolution),
            csViewportData: _.cloneDeep(this._cornerstoneViewportData),
            // Share displayed the image zone as well. The cornerstone's
            // `scale` and `translate` attributes are not enough to retrieve
            // the exact part of the image that has been displayed to the user
            // since this also depends on the canvas width & canvas height.
            displayedImageZone: this._getDisplayedImageZone(canvasWidth, canvasHeight)
        };

        // Switch back to original resultion.
        this.changeResolution(oldResolution);

        // Return serialized object.
        return result;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportWrapper
     * 
     * @name osimis.CornerstoneViewportWrapper#deserialize
     * 
     * @param {object} serializedObject
     * The serialized viewport data object
     * 
     * @return {osimis.CornerstoneViewportWrapper}
     * The deserialized viewport data object wrapper
     * 
     * @description 
     * Deserialize a stored serialized viewport data object. Due to
     * normalization, this version is based on max available image resolution.
     * You should call `#changeResolution` to adapt the data to the currently
     * loaded image resolution.
     */
    CornerstoneViewportWrapper.deserialize = function(serializedObject, canvasWidth, canvasHeight) {
        // Return wrapped object (with max resolution).
        return CornerstoneViewportWrapper.wrapCornerstoneViewport(
            serializedObject.csViewportData,
            serializedObject.imageResolution,
            serializedObject.imageResolution, // Current Viewport's Image Resolution === Max Resolution when serialized (due to normazilation)
            canvasWidth,
            canvasHeight,
            serializedObject.displayedImageZone
        );
    };

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportWrapper
     * 
     * @name osimis.CornerstoneViewportWrapper#changeResolution
     * 
     * @param {object} newImageResolution
     * An object containing the new resolution.
     *
     *   * {int} width The new image binary width
     *   * {int} height The new image binary height
     * 
     * @description 
     * Adapt cornerstone scale and translate based to a new resolution.
     */
    CornerstoneViewportWrapper.prototype.changeResolution = function(newImageResolution) {
        // Make sure input wont be changed.
        newImageResolution = _.cloneDeep(newImageResolution);

        // Adapt scale & translation properties
        var csViewportSync = new osimis.CornerstoneViewportSynchronizer();
        csViewportSync.sync(this._cornerstoneViewportData, this.currentImageResolution, newImageResolution);

        // Update translation wrapper
        if (!this._translationWrapper) {
            this._translationWrapper = {};
            var translation = this._cornerstoneViewportData.translation;
            Object.defineProperties(this._translationWrapper, {
                x: {
                    get: function() {
                        return translation.x;
                    },
                    set: function(value) {
                        translation.x = value;
                    }
                },
                y: {
                    get: function() {
                        return translation.y;
                    },
                    set: function(value) {
                        translation.y = value;
                    }
                }
            });                    
        }
        this._translationWrapper.y = this._cornerstoneViewportData.translation.y;
        this._translationWrapper.x = this._cornerstoneViewportData.translation.x;

        // Cache current image resolution for next call
        this.currentImageResolution = newImageResolution;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportWrapper
     * 
     * @name osimis.CornerstoneViewportWrapper#_displayImageZone
     * 
     * @param {object} imageZone
     * The displayed image zone. The structure must match the one returned by
     * the `_getDisplayedImageZone` method.
     * 
     * @param  {number} canvas_width
     * The width of the canvas, so we can fit the image zone within it.
     * 
     * @param  {number} canvas_height
     * The height of the canvas, so we can fit the image zone within it.
     * 
     * @description
     * Fit a specific zone of the image within the canvas. Useful to ensure a
     * viewport shared across multiple screen always display the same zone,
     * even if the dimension and proportion of the canvas differ.
     */
    CornerstoneViewportWrapper.prototype._displayImageZone = function(imageZone, canvas_width, canvas_height) {
        // Assert imageZone content (we may otherwise receive Infinity/NaN values).
        _.forEach(imageZone, function(value, propName) {
            if (!_.isFinite(value)) {
                throw new Error('Bad `imageZone` input variable format: '+propName+'='+value);
            }
        });

        // Consider we are in full resolution (for now).
        var oldRes = this.currentImageResolution;
        this.changeResolution(this.originalImageResolution);

        // Get image boundaries (& adapt to rotation).
        var image_width, image_height;
        var viewportData = this._cornerstoneViewportData;
        viewportData.rotation = viewportData.rotation || 0;
        if (Math.abs(viewportData.rotation) % 180 === 90) {
            // Invert width & height if image has been rotated.
            image_width = this.originalImageResolution.height;
            image_height = this.originalImageResolution.width;
        }
        else if (Math.abs(viewportData.rotation) % 180 === 0) {
            image_width = this.originalImageResolution.width;
            image_height = this.originalImageResolution.height;
        }
        else {
            throw new Error('Unexpected rotation ' + viewportData.rotate)
        }
    
        // Get host parameters.
        var imgtl_bbtl_translate_top = imageZone.imgtl_bbtl_translate_top;
        var imgtl_bbtl_translate_right = imageZone.imgtl_bbtl_translate_right;
        var imgtl_bbtl_translate_bottom = imageZone.imgtl_bbtl_translate_bottom;
        var imgtl_bbtl_translate_left = imageZone.imgtl_bbtl_translate_left;

        // Calculate bounding box w/h.
        var img_bb_width = imgtl_bbtl_translate_right - imgtl_bbtl_translate_left;
        var img_bb_height = imgtl_bbtl_translate_bottom - imgtl_bbtl_translate_top;
        
        // Scale bounding box to viewport.
        var width_scale =  canvas_width / img_bb_width;
        var height_scale =  canvas_height / img_bb_height;

        this.scale = Math.min(width_scale, height_scale);
        
        // Retrieve scaled bounding box size.
        var vp_bb_width = img_bb_width * this.scale;
        var vp_bb_height = img_bb_height * this.scale;
        
        // Retrieve scaled bounding box position.
        var vptl_bbtl_x = (canvas_width - vp_bb_width) / 2;
        var vptl_bbtl_y = (canvas_height - vp_bb_height) / 2;
    
        // Retrieve image position (tltl).
        var vp_img_width = image_width * this.scale; 
        var vp_img_height = image_height * this.scale;
        
        var vptl_bbtl_right = vptl_bbtl_x + vp_bb_width;
        var vptl_imgtl_x = - (imgtl_bbtl_translate_left * this.scale) + vptl_bbtl_x;
        var vptl_bbtl_bottom = vptl_bbtl_y + vp_bb_height;
        var vptl_imgtl_y = - (imgtl_bbtl_translate_top * this.scale) + vptl_bbtl_y;
        
        var vptl_img_center_x = vptl_imgtl_x + vp_img_width/2;
        var vptl_img_center_y = vptl_imgtl_y + vp_img_height/2;

        var vp_offset_x = canvas_width/2 - vptl_img_center_x;
        var vp_offset_y = canvas_height/2 - vptl_img_center_y;

        // Translation must be in img coordinates.
        this.translation.x = - vp_offset_x / this.scale;
        this.translation.y = - vp_offset_y / this.scale;

        // Reset resolution to normal one.
        this.changeResolution(oldRes);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportWrapper
     * 
     * @name osimis.CornerstoneViewportWrapper#_getDisplayedImageZone
     * 
     * @param  {number} canvas_width
     * The width of the canvas, so we can fit the image zone within it.
     * 
     * @param  {number} canvas_height
     * The height of the canvas, so we can fit the image zone within it.
     * 
     * @description
     * Retrieve the currently displayed image zone. Used to share the displayed
     * zone with other devices.
     */
    CornerstoneViewportWrapper.prototype._getDisplayedImageZone = function(canvas_width, canvas_height) {
        // Switch temporary to max resolution.
        var oldResolution = this.currentImageResolution;
        this.changeResolution(this.originalImageResolution);

        // Get image boundaries (& adapt to rotation).
        var image_width, image_height;
        var viewportData = this._cornerstoneViewportData;
        viewportData.rotation = viewportData.rotation || 0;
        if (Math.abs(viewportData.rotation) % 180 === 90) {
            // Invert width & height if image has been rotated.
            image_width = this.originalImageResolution.height;
            image_height = this.originalImageResolution.width;
        }
        else if (Math.abs(viewportData.rotation) % 180 === 0) {
            image_width = this.originalImageResolution.width;
            image_height = this.originalImageResolution.height;
        }
        else {
            throw new Error('Unexpected rotation ' + viewportData.rotate)
        }

        // Retrieve general data.
        var s = viewportData.scale; // scale is in max resolution also.
        var h_vp_image_width = image_width * s; // this is screen pixel width
        var h_vp_image_height = image_height * s; // this is screen pixel height

        // cornerstone vp. x,y coordinate do not change depending
        // on the image scaling (at least after the 
        // `csViewport.serialize` call), we have invariable x,y
        // coordinates. We want x, y to change when the scale 
        // change, as the image then takes much or less space
        // within the viewport.
        var h_img_imagemc_translate_x = viewportData.translation.x; // this is image pixel coord in max res 
        var h_img_imagemc_translate_y = viewportData.translation.y; 
        var h_vpmc_imagemc_translate_x = h_img_imagemc_translate_x * s;
        var h_vpmc_imagemc_translate_y = h_img_imagemc_translate_y * s;
        // cornerstone vp. x,y coordinate are positive & negative
        // coordinates relative to the image center. we want them
        // positive only, relative to the image top left so we can
        // have a clear indication of which pixel actually are
        // visible within the viewport. also, we need to compensate
        // scaling also, as cornerstone consider coordinates of the
        // scaled image.
        var h_vp_image_half_width = h_vp_image_width / 2;
        var h_vp_image_half_height = h_vp_image_height / 2;
        var h_vpmc_imagetl_translate_x = - (h_vp_image_half_width) + h_vpmc_imagemc_translate_x;
        var h_vpmc_imagetl_translate_y = - (h_vp_image_half_height) + h_vpmc_imagemc_translate_y;
        // cornerstone vp. x,y coordinate are positive & negative
        // coordinates relative to the viewport center. we want
        // them positive only, relative to the viewport top left so
        // we can have a clear indication of which pixel actually
        // are visible within the viewport.
        var canvas_half_width = canvas_width / 2;
        var canvas_half_height = canvas_height / 2;
        var h_vptl_imagetl_translate_x = canvas_half_width + h_vpmc_imagetl_translate_x;
        var h_vptl_imagetl_translate_y = canvas_half_height + h_vpmc_imagetl_translate_y;
        // Set the position of the bouding box.
        var h_vptl_bb_left = Math.max(0, Math.min(canvas_width, h_vptl_imagetl_translate_x));
        var h_vptl_bb_top = Math.max(0, Math.min(canvas_height, h_vptl_imagetl_translate_y));
        // Set the dimension of the bounding box.
        var h_vptl_bb_right = Math.min(canvas_width, h_vptl_imagetl_translate_x + h_vp_image_width);
        var h_vptl_bb_bottom = Math.min(canvas_height, h_vptl_imagetl_translate_y + h_vp_image_height);

        var h_vp_bb_width = Math.max(0, h_vptl_bb_right - h_vptl_bb_left);
        var h_vp_bb_height = Math.max(0, h_vptl_bb_bottom - h_vptl_bb_top);

        // Create result.
        var result = {
            // Position of the bounding box relative to the full image. This is
            // used to know what to display in liveshare attendee's viewport.
            imgtl_bbtl_translate_top: (h_vptl_bb_top - h_vptl_imagetl_translate_y) / s,
            imgtl_bbtl_translate_right: (h_vptl_bb_right - h_vptl_imagetl_translate_x) / s,
            imgtl_bbtl_translate_bottom: (h_vptl_bb_bottom - h_vptl_imagetl_translate_y) / s,
            imgtl_bbtl_translate_left: (h_vptl_bb_left - h_vptl_imagetl_translate_x) / s,

            // Position of the bounding box relative to the viewport. This is
            // used to know where to track the liveshare host's cursor.
            vptl_imgtl_t: h_vptl_imagetl_translate_y,
            vptl_imgtl_r: h_vptl_imagetl_translate_x + h_vp_image_width,
            vptl_imgtl_b: h_vptl_imagetl_translate_y + h_vp_image_height,
            vptl_imgtl_l: h_vptl_imagetl_translate_x,
        };

        // Switch back to previous resolution.
        this.changeResolution(oldResolution);

        // Return result.
        return result;
    };

    CornerstoneViewportWrapper.prototype.convertImageCoordToViewportCoord = function(imgtl_coord_x, imgtl_coord_y, canvas_width, canvas_height) {
        var vptl_coord_x, vptl_coord_y;

        // Consider ourself in HQ image coordinates (since inputs imgtl_x,
        // imgtl__y are considered HQ).
        var tmpCurrentImageResolution = this.currentImageResolution;
        this.changeResolution(this.originalImageResolution);

        // Get image boundaries (& adapt to rotation).
        var image_width, image_height;
        var viewportData = this._cornerstoneViewportData;
        viewportData.rotation = viewportData.rotation || 0;
        if (Math.abs(viewportData.rotation) % 180 === 90) {
            // Invert width & height if image has been rotated.
            image_width = this.originalImageResolution.height;
            image_height = this.originalImageResolution.width;
        }
        else if (Math.abs(viewportData.rotation) % 180 === 0) {
            image_width = this.originalImageResolution.width;
            image_height = this.originalImageResolution.height;
        }
        else {
            throw new Error('Unexpected rotation ' + viewportData.rotate)
        }

        // Get image in viewport coordinates (considering scale).
        var viewportData = this._cornerstoneViewportData;
        var vpmc_imgmc_x = viewportData.translation.x * viewportData.scale;
        var vpmc_imgmc_y = viewportData.translation.y * viewportData.scale;

        var vptl_imagemc_x = vpmc_imgmc_x + canvas_width/2;
        var vptl_imagemc_y = vpmc_imgmc_y + canvas_height/2;

        var vptl_imagetl_x = vptl_imagemc_x - (image_width/2 * viewportData.scale);
        var vptl_imagetl_y = vptl_imagemc_y - (image_height/2 * viewportData.scale);

        // Convert image coordinates to viewport coordinates
        vptl_coord_x = vptl_imagetl_x + (imgtl_coord_x * viewportData.scale);
        vptl_coord_y = vptl_imagetl_y + (imgtl_coord_y * viewportData.scale);

        // Switch image resolution back.
        this.changeResolution(tmpCurrentImageResolution);

        return {
            x: vptl_coord_x,
            y: vptl_coord_y
        }
    };
    
    /**
     * @ngdoc method
     * @methodOf osimis.CornerstoneViewportWrapper
     * 
     * @name osimis.CornerstoneViewportWrapper.wrapCornerstoneViewport
     * 
     * @param {object} cornerstoneViewport
     * The cornerstone viewport data object to wrap. See
     * `https://github.com/chafey/cornerstone/wiki/viewport`.
     * 
     * @param {object} originalImageResolution
     * An object containing the full image resolution.
     *
     *   * {int} width The full-resolution image binary's width
     *   * {int} height The full-resolution image binary's height
     *
     * @param {object} currentImageResolution
     * An object containing the current image resolution as used in the
     * _cornerstonecanvas_ object.
     *
     *   * {int} width The current image binary width
     *   * {int} height The current image binary height
     *
     * @param {number} [canvasWidth=null]
     * Canvas width - required to be able to display a specific zone of an
     * image (see the `trackedImageZone` parameter).
     * 
     * @param {number} [canvasHeight=null]
     * Canvas height - required to be able to display a specific zone of an
     * image (see the `trackedImageZone` parameter).
     * 
     * @param {object} [trackedImageZone=null]
     * Display this specific image zone each time the window is resized. The
     * value of this object must follow the structure returned by the 
     * `_getDisplayedImageZone` method.
     *
     * @return {osimis.CornerstoneViewportWrapper}
     * The wrapped cornerstone viewport data.
     *
     * @description 
     * Return a wrapped cornerstone viewport data objet, managing multiple
     * image resolution. Every input is garanteed to not change.
     */
    CornerstoneViewportWrapper.wrapCornerstoneViewport = function(cornerstoneViewport, originalImageResolution, currentImageResolution, canvasWidth, canvasHeight, trackedImageZone, enabledElement) {
        // Make sure inputs wont be changed.
        cornerstoneViewport = _.cloneDeep(cornerstoneViewport);
        originalImageResolution = _.cloneDeep(originalImageResolution);
        currentImageResolution = _.cloneDeep(currentImageResolution);
        trackedImageZone = trackedImageZone && _.cloneDeep(trackedImageZone);

        // Wrap viewport data
        var wrappedViewportDataObject = new CornerstoneViewportWrapper(
            originalImageResolution,
            currentImageResolution,
            cornerstoneViewport,
            canvasWidth,
            canvasHeight,
            trackedImageZone,
            enabledElement
        );

        // Return the wrapped object
        return wrappedViewportDataObject;
    };

    // Resolution-dependent attribut may be set either via cornestone tools
    // (in terms of current resolution) or via wvb setters (in terms of 
    // original resolution). The original interface is kept only for
    // cornerstone interactions as the cornerstone interaction requires us 
    // to consider the current interface as the cornerstone one, whereas we 
    // can use a different interface for the wvb setters which need a 
    // different behavior. The cornerstone implementation uses pixels based on 
    // the current image resolution.
    Object.defineProperties(CornerstoneViewportWrapper.prototype, {
        scale: {
            configurable: false,
            enumerable: true,
            get: function() {
                return this._cornerstoneViewportData.scale;
            },
            set: function(value) {
                // When the scale is redefined, we make sure to convert it
                // from the current image resolution 
                this._cornerstoneViewportData.scale = value;
            }
        },
        translation: {
            configurable: false,
            enumerable: true,
            get: function() {
                // Cache translation wrapper to avoid recreating each time as 
                // it is very slow due to the `#defineProperties usage.
                if (!this._translationWrapper) {
                    this._translationWrapper = {};
                    var translation = this._cornerstoneViewportData.translation;
                    Object.defineProperties(this._translationWrapper, {
                        x: {
                            configurable: false,
                            enumerable: true,
                            get: function() {
                                return translation.x;
                            },
                            set: function(value) {
                                translation.x = value;
                            }
                        },
                        y: {
                            configurable: false,
                            enumerable: true,
                            get: function() {
                                return translation.y;
                            },
                            set: function(value) {
                                translation.y = value;
                            }
                        }
                    });
                }

                return this._translationWrapper;
            },
            set: function(value) {
                // Cache translation wrapper to avoid recreating each time as 
                // it is very slow due to the `#defineProperties usage.
                if (!this._translationWrapper) {
                    this._translationWrapper = {};
                    var translation = this._cornerstoneViewportData.translation;
                    Object.defineProperties(this._translationWrapper, {
                        x: {
                            get: function() {
                                return translation.x;
                            },
                            set: function(value) {
                                translation.x = value;
                            }
                        },
                        y: {
                            get: function() {
                                return translation.y;
                            },
                            set: function(value) {
                                translation.y = value;
                            }
                        }
                    });                    
                }

                this._translationWrapper.y = value.y;
                this._translationWrapper.x = value.x;
            }
        },
        voi: {
            configurable: false,
            enumerable: true,
            get: function() {
                return this._cornerstoneViewportData.voi;
            },
            set: function(value) {
                this._cornerstoneViewportData.voi = value;
            }
        },
        invert: {
            configurable: false,
            enumerable: true,
            get: function() {
                return this._cornerstoneViewportData.invert;
            },
            set: function(value) {
                this._cornerstoneViewportData.invert = value;
            }
        },
        pixelReplication: {
            configurable: false,
            enumerable: true,
            get: function() {
                return this._cornerstoneViewportData.pixelReplication;
            },
            set: function(value) {
                this._cornerstoneViewportData.pixelReplication = value;
            }
        },
        hflip: {
            configurable: false,
            enumerable: true,
            get: function() {
                return this._cornerstoneViewportData.hflip;
            },
            set: function(value) {
                this._cornerstoneViewportData.hflip = value;
            }
        },
        vflip: {
            configurable: false,
            enumerable: true,
            get: function() {
                return this._cornerstoneViewportData.vflip;
            },
            set: function(value) {
                this._cornerstoneViewportData.vflip = value;
            }
        },
        rotation: {
            configurable: false,
            enumerable: true,
            get: function() {
                return this._cornerstoneViewportData.rotation;
            },
            set: function(value) {
                this._cornerstoneViewportData.rotation = value;
            }
        },
        modalityLUT: {
            configurable: false,
            enumerable: true,
            get: function() {
                return this._cornerstoneViewportData.modalityLUT;
            },
            set: function(value) {
                this._cornerstoneViewportData.modalityLUT = value;
            }
        },
        voiLUT: {
            configurable: false,
            enumerable: true,
            get: function() {
                return this._cornerstoneViewportData.voiLUT;
            },
            set: function(value) {
                this._cornerstoneViewportData.voiLUT = value;
            }
        }
    });

    osimis.CornerstoneViewportWrapper = CornerstoneViewportWrapper;

})(this.osimis || (this.osimis = {}));
