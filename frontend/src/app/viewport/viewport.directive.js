/**
 * @ngdoc directive
 * @name webviewer.directive:wvViewport
 *
 * @param {object} wvSize Please have a look at the `wvSize` directive source code for more information
 *
 * @param {string} [wvImageId]
 *   The id of the displayed image can be set using this attribute.
 *   It can also be set without attributes, using inter-directive communication. Therefore this attribute may be changed
 *   by the viewport itself (eg. when a series is dropped on the viewport).
 *   image_id = <orthanc-instance-id>:<frame-index> where frame-index = n ⊂ [0; 1000]
 *
 * @param {osimis.Image} [wvImage] (readonly)
 *   Share the image model instance.
 *   The viewport handles the image model loading. Therefore, it also provide access to it.
 *   This is done through this attribute, which should only be used to retrieve the model, not to set it.
 *
 * @param {string} [wvSeriesId]
 *   Please have a look at the `wvSeriesId` directive source code for more information
 *   concerning _wvSeriesId_ attribute, and other related attributes (for instance _wvSeries_ and _wvOnSeriesChange_).
 *
 * @param {callback} [wvOnImageChange]
 *   triggered when image has effectively changed
 *
 *   Available Callback Arguments:
 *   * `$image` - image_model
 *
 * @param {object} [wvViewport]
 *   Share the cornerstone viewport data. It is different from the viewport
 *   model which is only accessible via viewport plugins. When set to null,
 *   the viewport data is reset to the default value.
 *
 *   The cornerstone viewport object contains the following attributes (source: https://github.com/chafey/cornerstone/wiki/viewport):
 *   * `scale` - The scale applied to the image. A scale of 1.0 will display no zoom (one image pixel takes up one screen pixel). A scale of 2.0 will be double zoom and a scale of .5 will be zoomed out by 2x
 *   * `translation` - an object with properties x and y which describe the translation to apply in the pixel coordinate system. Note that the image is initially displayed centered in the enabled element with a x and y translation of 0 and 0 respectively.
 *   * `voi` - an object with properties windowWidth and windowCenter.
 *   * `invert` - true if the image should be inverted, false if not.
 *   * `pixelReplication` - true if the image smooth / interpolation should be used when zoomed in on the image or false if pixel replication should be used.
 *   * `hflip` - true if the image is flipped horizontally. Default is false
 *   * `vflip` - true if the image is flipped vertically. Default is false
 *   * `rotation` - the rotation of the image (90 degree increments). Default is 0
 *
 * @param {boolean} [wvLossless=false] Force lossless quality fetching.
 *   * `false` - fetch image with quality based on viewport size.
 *   * `true` - fetch image with the maximum available quality.
 *   Note it doesn't disable progressive loading.
 *
 * @scope
 * @restrict Element
 * @requires webviewer.directive:wvSize
 *
 * @description
 * The `wvViewport` directive display medical images inside a canvas.
 *
 * It is built to be extended by other directives. Have a look at the following folders
 * to discover how to use every viewport-related features:
 * - `wvSeriesId` is primarily used to display whole series instead of single images, please refer
 *   to the specific file for more information.
 * - _image-plugins/_ folder contains tools to add annotations to the viewport and to process it.
 * - _series-plugins/_ folder contains extensions relative to the series
 *
 * The wvSize directive must be used to set the size of the viewport element. See the corresponding documentation
 * for more information.
 *
 * An overlay is shown if the attribute wvEnableOverlay is set to true. The overlay show the
 * wvOverlay directive by default. It may be overloaded using standard transclusion. It is therefore
 * important to not put any whitespace between the DOM element's start and end tags, otherwise the default
 * overlay will be overloaded with white space.
 * By setting the overlay's css _position_ attribute to _absolute_, the overlay can position information to the top, right, bottom and left sides
 * of the viewport.
 *
 * @example
 * Display a specific image with some informations
 *
 * ```html
 * <wv-viewport wv-image-id="'your-image-id" wv-image="$image" wv-size="{width: '100px', height: '100px'}"
 $              wv-viewport="$viewport" wv-lossless="true"
 * ></wv-viewport>
 * <p>{{$image.tags.PatientName}}</p>
 * <p>image position: {{$viewport.translate}}</p>
 * ```
 *
 * @example
 * Display a specific image with custom overlay
 *
 * ```html
 * <wv-viewport wv-image-id="'your-image-id'" wv-image="$image" wv-size="{width: '100px', height: '100px'}"
 *              wv-viewport="$viewport" wv-lossless="true">
 *     <h1>My overloaded Overlay!</h1>
 *     <p style="position; absolute; bottom: 0;">
 *         {{$image.tags.PatientName}}
 *     </p>
 * </wv-viewport>
 * ```
 **/
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvViewport', wvViewport)
        .run(configureViewportModel)
        .run(extendCornerstoneToolStateManager);

    /**
     * Doc available at the head of the file
     * @ngInject
     */
    function wvViewport($, _, cornerstone, cornerstoneTools, $rootScope, $q, $parse, wvImageManager, wvReferenceLines) {
        var directive = {
            transclude: true,
            bindToController: true,
            controller: Controller,
            controllerAs: 'vm',
            templateUrl: 'app/viewport/viewport.directive.html',
            link: link,
            restrict: 'E',
            require: {
                'wvViewportCtrl': 'wvViewport', // Ctrl postfix to avoid conflict w/ scope attribute
                'wvSizeCtrl': 'wvSize' // @todo make optional (by setting a canvas size equals to the shown image size)
            },
            scope: {
                wvImageId: '=?',
                wvImage: '=?',
                wvOnImageChange: '&?',
                csViewport: '=?wvViewport',
                model: '=?wvViewportModel',
                wvEnableOverlay: '=?', // boolean [false]
                wvLossless: '@?' // boolean [false] - Always fetch lossless if true
            }
        };

        function areViewportEqual(oldCsViewport, newCsViewport) {
            return oldCsViewport._cornerstoneViewportData.hflip === newCsViewport._cornerstoneViewportData.hflip &&
                oldCsViewport._cornerstoneViewportData.invert === newCsViewport._cornerstoneViewportData.invert &&
                oldCsViewport._cornerstoneViewportData.modalityLUT === newCsViewport._cornerstoneViewportData.modalityLUT &&
                oldCsViewport._cornerstoneViewportData.pixelReplication === newCsViewport._cornerstoneViewportData.pixelReplication &&
                oldCsViewport._cornerstoneViewportData.rotation === newCsViewport._cornerstoneViewportData.rotation &&
                oldCsViewport._cornerstoneViewportData.vflip === newCsViewport._cornerstoneViewportData.vflip &&
                oldCsViewport._cornerstoneViewportData.voi.windowCenter === newCsViewport._cornerstoneViewportData.voi.windowCenter &&
                oldCsViewport._cornerstoneViewportData.voi.windowWidth === newCsViewport._cornerstoneViewportData.voi.windowWidth &&
                oldCsViewport._cornerstoneViewportData.voiLUT === newCsViewport._cornerstoneViewportData.voiLUT &&
                oldCsViewport._cornerstoneViewportData.scale === newCsViewport._cornerstoneViewportData.scale &&
                oldCsViewport._cornerstoneViewportData.translation.x === newCsViewport._cornerstoneViewportData.translation.x &&
                oldCsViewport._cornerstoneViewportData.translation.y === newCsViewport._cornerstoneViewportData.translation.y;
        };
        /**
         * @responsibility manage directive's information flow
         *
         * dataflows:
         *   directive's controller
         *     [command] -> controller -> attributes/$scope -> viewmodel -> cornerstone API -> [dom]
         *     [request] <- controller <- attributes/$scope <- viewmodel <- [out]
         *   directive's attributes
         *     [command] -> attributes/$scope -> viewmodel -> cornerstone API -> [dom]
         *     [request] <- attributes/$scope <- viewmodel <- [out]
         *   wv-size dependency
         *     [update] -> viewmodel -> cornerstone API -> [dom]
         */
        function link(scope, element, attrs, ctrls) {
            var enabledElement = element.children('div').children('.wv-cornerstone-enabled-image')[0];
            var model = new osimis.Viewport($q, cornerstone, enabledElement, !!scope.vm.wvLossless, wvReferenceLines);
            scope.vm.model = model
            scope.vm.setFocus = function(){
                // because of unselectable, we set the focus on the click in case the viewer is embedded in an iframe.
                // this should allow the iframe to get the focus
                enabledElement.focus();
            };

            scope.vm.wvEnableOverlay = !!scope.vm.wvEnableOverlay;
            var wvImageIdParser = $parse(attrs.wvImageId);

            var _watchedValue = {
                imageId: scope.vm.wvImageId || null,
                csViewport: scope.vm.csViewport && scope.vm.csViewport.clone() || null // the `.clone` is only here to be able to deep compare new values with old ones (otherwise both old & new variable would reference the same object)
            };

            // bind directive's sizing (via wv-size controller) to cornerstone
            {
                var wvSizeCtrl = ctrls.wvSizeCtrl;
                var unbindWvSize = _bindWvSizeController(wvSizeCtrl, model);
            }

            // bind directive's controller to cornerstone (via directive's attributes)
            {
                var ctrl = ctrls.wvViewportCtrl;
                ctrl.getImage = function() {
                    return model.getImageId();
                };
                ctrl.getModel = function() {
                    return model;
                }
                ctrl.setImage = function(newImageId, resetViewport) {
                    var oldImageId = _watchedValue.imageId || null;
                    var newImageId = newImageId || null;
                    var oldCsViewport = oldImageId && _watchedValue.csViewport || null;
                    var newCsViewport = newImageId && scope.vm.csViewport || null;

                    // Assert values (because if they are not finite, they
                    // will always return false on equality comparison,
                    // thus triggering infinite $digest cycles.
                    if (newCsViewport && !isFinite(newCsViewport._cornerstoneViewportData.scale)) {
                        throw new Error('!isFinite(Scale): ' + newCsViewport._cornerstoneViewportData.scale);
                    }
                    if (newCsViewport && newCsViewport._cornerstoneViewportData.translation && (!isFinite(newCsViewport._cornerstoneViewportData.translation.x) || !isFinite(newCsViewport._cornerstoneViewportData.translation.y))) {
                        throw new Error('!isFinite(translation.?)');
                    }

                    // Case 1:
                    // Do nothing if no change
                    if (!newImageId && !oldImageId) {

                    }
                    // Case 2:
                    //   RESET IMAGE
                    else if (!newImageId && oldImageId) {
                        model.clearImage();
                    }
                    // Case 3:
                    // If image has changed, we update it
                    //   SET NEW IMAGE (or first one, at directive setup)
                    //   DOWNLOAD IMAGE
                    //   WAIT
                    //   SET IMAGE
                    //   UPDATE VIEWPORT
                    //   DRAW IMAGE
                    else if (newImageId !== oldImageId) {
                        // Load image model & set it.
                        wvImageManager
                            .get(newImageId)
                            // Wait
                            .then(function setImageViaCtrl(newImage) {
                                // Set/Reset the viewport
                                resetViewport = resetViewport || !newCsViewport;
                                if (!resetViewport && newCsViewport) {
                                    model.setViewport(newCsViewport, newImage.instanceInfos.TagsSubset.WindowCenter, newImage.instanceInfos.TagsSubset.WindowWidth);
                                }

                                // Set image & draw
                                return model.setImage(newImage, resetViewport);
                            });
                    }

                    // Update databound values
                    scope.vm.wvImageId = newImageId;

                    // Update old values if they have changed.
                    if (newImageId !== oldImageId) {
                        _watchedValue.imageId = newImageId;
                    }
                    // May requires deep comparison.
                    if (newCsViewport !== oldCsViewport && (!newCsViewport || !oldCsViewport || !areViewportEqual(oldCsViewport, newCsViewport))) {
                        _watchedValue.csViewport = newImageId && newCsViewport && newCsViewport.clone() || null; // the `.clone` is only here to be able to deep compare new values with old ones (otherwise both old & new variable would reference the same object)
                    }
                    /*
                    _watchedValue = {
                        imageId: newImageId,
                        csViewport: newCsViewport// scope.vm.wvImageId && scope.vm.csViewport && scope.vm.csViewport.clone() // the `.clone` is only here to be able to deep compare new values with old ones (otherwise both old & new variable would reference the same object)
                    };
                    */
                };
                ctrl.clearImage = function() {
                    scope.vm.wvImageId = null;
                };
            }

            // bind directive's imageId & viewport attributes to cornerstone
            // image & viewports
            {
                // To ensure viewport is not reset before the image changes (
                // instead of after), we need to treat both imageId & viewport
                // variable at the same times.

                // @warning This part is highly performance critical!
                // We can't rely on traditional AngularJS $watch tools as
                // 1. They may triggers recursive $digest loop (this is why we
                //    rely on a _watchedValue global variables to cache the
                //    state prior to the digest and be able to update it
                //    manually outside of the $digest cycle: when the viewport
                //    is updated via the controller).
                // 2. They are too slow for this performance intensive code and
                //    degrade the performance too much. We therefore perform
                //    comparisons manually and take care to do them in an
                //    optimized order.
                //
                // The following function is performed at each $digest cycle.
                var _firstWatch = true;
                scope.$watch(function fromWatch() {
                    var oldImageId = _watchedValue.imageId || null;
                    var newImageId = scope.vm.wvImageId || null;
                    var oldCsViewport = oldImageId && _watchedValue.csViewport || null;
                    var newCsViewport = newImageId && scope.vm.csViewport || null;
                    _firstWatch = _firstWatch && newImageId === oldImageId;

                    if (newImageId == null) { // force clearing the image if there's nothing to display
                      model.clearImage();
                    }

                    // Assert values (because if they are not finite, they
                    // will always return false on equality comparison,
                    // thus triggering infinite $digest cycles.
                    if (newCsViewport && !isFinite(newCsViewport._cornerstoneViewportData.scale)) {
                        throw new Error('!isFinite(Scale): ' + newCsViewport._cornerstoneViewportData.scale);
                    }
                    if (newCsViewport && newCsViewport._cornerstoneViewportData.translation && (!isFinite(newCsViewport._cornerstoneViewportData.translation.x) || !isFinite(newCsViewport._cornerstoneViewportData.translation.y))) {
                        throw new Error('!isFinite(translation.?)');
                    }

                    // Case 1:
                    // Do nothing if image wasn't displayed and is still not
                    if (!newImageId && !oldImageId) {

                    }
                    // Case 2:
                    //   RESET IMAGE
                    else if (!newImageId && oldImageId) {
                        // already handled above
                    }
                    // Case 3:
                    // If image has changed, we update it
                    //   SET NEW IMAGE (or first one, at directive setup)
                    //   DOWNLOAD IMAGE
                    //   WAIT
                    //   SET IMAGE
                    //   UPDATE VIEWPORT
                    //   DRAW IMAGE
                    else if (newImageId !== oldImageId || _firstWatch) {
                        // Load image model & set it.
                        wvImageManager
                            .get(newImageId)
                            // Wait
                            .then(function setImageViaWatch(newImage) {
                                // Set/Reset the viewport
                                var resetViewport = undefined;
                                if (newCsViewport) {
                                    model.setViewport(newCsViewport, newImage.instanceInfos.TagsSubset.WindowCenter, newImage.instanceInfos.TagsSubset.WindowWidth); // newUnserializedCsViewport
                                    resetViewport = false;
                                }
                                else {
                                    resetViewport = true;
                                }

                                // Set image & draw
                                return model.setImage(newImage, resetViewport);
                            });
                    }
                    // Case 4:
                    //   DO NOTHING
                    else if (!newCsViewport && !oldCsViewport) {

                    }
                    // Case 5:
                    // @todo compare oldCsViewport & newCsViewport by ref once
                    // we change their references only when they are different
                    // Do nothing if they are the same, so we slow down write
                    // a lot but enhance global $digest speed.
                    else if (false) {

                    }
                    // Case 6:
                    //   RESET VIEWPORT
                    //   KEEP IMAGE
                    //   DRAW IMAGE
                    else if (!newCsViewport && oldCsViewport) {
                        model.reset();
                        model.draw(false);
                    }
                    // Case 7:
                    // Update cs viewport if it is different
                    //   UPDATE CS VIEWPORT
                    //   KEEP IMAGE
                    //   DRAW IMAGE
                   else if (!oldCsViewport || !areViewportEqual(oldCsViewport, newCsViewport)) {
                        // Update csViewport
                        model.setViewport(newCsViewport); // newUnserializedCsViewport
                        model.draw(false);
                    }

                    // Update old values
                    _firstWatch = false;

                    // Update old values if they have changed.
                    if (newImageId !== oldImageId) {
                        _watchedValue.imageId = newImageId;
                    }

                    if (newCsViewport !== oldCsViewport && (!newCsViewport || !oldCsViewport || !areViewportEqual(oldCsViewport, newCsViewport))) {
                        _watchedValue.csViewport = newImageId && newCsViewport && newCsViewport.clone() || null; // the `.clone` is only here to be able to deep compare new values with old ones (otherwise both old & new variable would reference the same object)
                    }

                    // Always return false, as we do not use the watch function
                    return false;
                }, _.noop);
            }

            // The next chunk of code binds the model with the `wv-image`
            // attribute *output* so the directive user can read the updated
            // value in real time. It also triggers the `wv-on-image-change`
            // event.
            model.onImageChanged(function(image) {
                if (scope.vm.wvOnImageChange) {
                    scope.vm.wvOnImageChange({$image: image});
                }

                // Update scope values
                scope.vm.wvImage = image;

                // Update old values if they have changed.
                if (scope.vm.wvImageId !== _watchedValue.imageId) {
                    _watchedValue.imageId = scope.vm.wvImageId;
                }
                // May requires deep comparison.
                if (scope.vm.csViewport !== _watchedValue.csViewport && !_.isEqual(scope.vm.csViewport, _watchedValue.csViewport)) {
                    _watchedValue.csViewport = scope.vm.wvImageId && scope.vm.csViewport && scope.vm.csViewport.clone() || null; // the `.clone` is only here to be able to deep compare new values with old ones (otherwise both old & new variable would reference the same object)
                }
            });

            // The next chunk of code binds the model with the `wv-viewport`
            // attribute *output* so the directive user can read the updated
            // value in real time.
            var _oldCsViewport = _.cloneDeep(scope.vm.csViewport && scope.vm.csViewport._cornerstoneViewportData) || null;
            $(model._enabledElement).on('CornerstoneImageRendered', function(evt, args) { // element.off not needed

                // We do want this to update the csViewport, but only

                // var oldCsViewport = _oldCsViewport;
                // var newCsViewport = model._viewportData && model._viewportData._cornerstoneViewportData || null;

                // // @warning We have to do deep performance comparison to
                // //     trigger a new digest cycle because CornerstoneTools
                // //     bypass the web viewer interfaces. Since most tools have
                // //     been wrapped, this is not required — with the exception
                // //     of the zoom tool! We therefore do it even if it is
                // //     performance intensive (especially when playing a
                // //     series). It is also required to keep the vm.csViewport
                // //     in sync, but only a shallow comparison is required for
                // //     this.
                // if (newCsViewport !== oldCsViewport || !_.isEqual(oldCsViewport, newCsViewport)) {
                //     // Update old cs viewport
                //     _oldCsViewport = _.cloneDeep(newCsViewport);
                    // Trigger a new digest if needed
                    scope.$evalAsync(function() {
                        // Update scope values
                        scope.vm.csViewport = model._viewportData;

                        // Update old values if they have changed.
                        if (scope.vm.wvImageId !== _watchedValue.imageId) {
                            _watchedValue.imageId = scope.vm.wvImageId;
                        }
                        // May requires deep comparison.
                        // @warning `_.isEqual` will always return false in this case, even if object are equals (perhaps due to cloned methods).
                        // if (scope.vm.csViewport !== _watchedValue.csViewport && !_.isEqual(scope.vm.csViewport, _watchedValue.csViewport)) {

                        var oldCsViewport = _watchedValue.csViewport;
                        var newCsViewport = scope.vm.csViewport;

                        // Assert values (because if they are not finite, they
                        // will always return false on equality comparison,
                        // thus triggering infinite $digest cycles.
                        if (newCsViewport && !isFinite(newCsViewport._cornerstoneViewportData.scale)) {
                            throw new Error('!isFinite(Scale): ' + newCsViewport._cornerstoneViewportData.scale);
                        }
                        if (newCsViewport && newCsViewport._cornerstoneViewportData.translation && (!isFinite(newCsViewport._cornerstoneViewportData.translation.x) || !isFinite(newCsViewport._cornerstoneViewportData.translation.y))) {
                            throw new Error('!isFinite(translation.?)');
                        }

                        if ((!oldCsViewport && newCsViewport) ||
                            (oldCsViewport && !newCsViewport) ||
                            (oldCsViewport && newCsViewport) &&
                            (!areViewportEqual(oldCsViewport, newCsViewport))
                        ) {
                            _watchedValue.csViewport = scope.vm.wvImageId && scope.vm.csViewport && scope.vm.csViewport.clone() || null; // the `.clone` is only here to be able to deep compare new values with old ones (otherwise both old & new variable would reference the same object)
                        }
                    });
                // }
            });

            // unlisten binds
            scope.$on('$destroy', function() {
                if (unbindWvSize) {
                    unbindWvSize();
                    unbindWvSize = null;
                }
                model.destroy();
            });

            function _bindWvSizeController(wvSizeController, model) {
                if (!wvSizeController) {
                    // @todo resize based on image size and not on element size (wich is always 0)
                    var oldCanvasSize = model.getCanvasSize();

                    var newCanvasSize = {
                        width: element.width(),
                        height: element.height()
                    };

                    // Resize canvas & redraw only if value as changed. This
                    // condition prevent bugs from occuring! Consider there is
                    // two types of viewports, thumbnails & diagnosis one. They
                    // have different quality policy. The tend to display low
                    // quality whereas the second one switch from low to high
                    // once downloaded. As such, it is important to invalidate
                    // cache (using `model.draw(true)` instead of
                    // `model.draw(false)` each time we draw an image with a
                    // different resolution. We can have the luxery to avoid
                    // doing it here since thumbnail viewports always have the
                    // same size (there is no need to redraw them), while
                    // viewports displaying the same image have synchronized
                    // resolution (thus, the cache is invalidated when new
                    // quality is downloaded). Therefore, we don't need to
                    // invalidate the cornerstone cache each time the viewport
                    // is resized.
                    // @warning If any of the above condition is no longer
                    // true, the `model.draw(false)` has to be changed into
                    // `model.draw(true)` (at some performance cost.
                    if (!_.isEqual(oldCanvasSize, newCanvasSize)) {
                        model.resizeCanvas(newCanvasSize.width, newCanvasSize.height);
                        model.draw(false);
                    }

                    return null;
                }

                var unlistenWvSizeFn = wvSizeController && wvSizeController.onUpdate(function resizeCanvas() {
                    var oldCanvasSize = model.getCanvasSize();
                    var newCanvasSize = {
                        width: wvSizeController.getWidthInPixel(),
                        height: wvSizeController.getHeightInPixel()
                    };

                    // Resize canvas & redraw only if value as changed. This
                    // condition prevent bugs from occuring! Consider there is
                    // two types of viewports, thumbnails & diagnosis one. They
                    // have different quality policy. The tend to display low
                    // quality whereas the second one switch from low to high
                    // once downloaded. As such, it is important to invalidate
                    // cache (using `model.draw(true)` instead of
                    // `model.draw(false)` each time we draw an image with a
                    // different resolution. We can have the luxery to avoid
                    // doing it here since thumbnail viewports always have the
                    // same size (there is no need to redraw them), while
                    // viewports displaying the same image have synchronized
                    // resolution (thus, the cache is invalidated when new
                    // quality is downloaded). Therefore, we don't need to
                    // invalidate the cornerstone cache each time the viewport
                    // is resized.
                    // @warning If any of the above condition is no longer
                    // true, the `model.draw(false)` has to be changed into
                    // `model.draw(true)` (at some performance cost.
                    if (!_.isEqual(oldCanvasSize, newCanvasSize)) {
                        model.resizeCanvas(newCanvasSize.width, newCanvasSize.height);
                        model.draw(false);
                    }
                });

                return function unbind() {
                    unlistenWvSizeFn();
                }
            }

            /** register tools
             *
             * Tool directive spec:
             * - name ends with ViewportTool
             *
             * Tool controller interface:
             * - void register(ctrl)
             * - void unregister(ctrl)
             */
            // register the tools once there is an image
            model.onImageChanged.once(function(currentImage) {
                _forEachViewportTool(function(toolCtrl) {
                    toolCtrl.register(model);
                    scope.$on('$destroy', function() {
                        toolCtrl.unregister(model);
                    });
                });
            });
            function _forEachViewportTool(callback) {
                _.forEach(ctrls, function(ctrl, ctrlName) {
                    var ctrlIsTool = _.endsWith(ctrlName, 'ViewportTool');
                    if (!ctrl) {
                        return;
                    }
                    else if (ctrlIsTool) {
                        callback(ctrl, ctrlName);
                    }
                });
            }
        }


        return directive;
    }

    /**
     * @responsibility manage inter-directive communications
     *
     * @ngInject
     */
    function Controller($scope, $element, cornerstone, wvImageManager) {
        this.getImage = angular.noop;
        this.setImage = angular.noop;
        this.clearImage = angular.noop;
    }

    /**
     * @responsibility inject the Viewport Model's dependencies
     *
     * It injects $q.
     *
     * @ngInject
     */
    function configureViewportModel($q) {
        // Inject $q in Viewport model
        osimis.Viewport.$q = $q;
    }

    /**
     * @responsibility extends the cornerstone toolStateManager
     *
     * The goal is primarily to enable polling off cornerstoneTools'
     * annotations so they can shared in real time.
     *
     * @ngInject
     */
    function extendCornerstoneToolStateManager(cornerstoneTools) {
        var toolStateManager = cornerstoneTools.newImageIdSpecificToolStateManager();
        toolStateManager.getStateByToolAndImageId = function(toolName, imageId) {
            return this.toolState[imageId] && this.toolState[imageId][toolName];
        };

        /**
         * @param {boolean} [redraw=true]
         *
         * You can choose to not redraw the image after updating the tools data.
         * This is usefull to avoid useless dual redrawing when the data changes because the image also changes.
         *
         * As long as the listener onImageChanging is used instead of onImageChanged,
         * the drawing will occurs after the tool reloading,
         *
         * @description
         * Set the annotation data of a specific tool & image in cornerstone.
         */
        toolStateManager.restoreStateByToolAndImageId = function(toolName, imageId, state, redraw) {
            if (typeof redraw === 'undefined') redraw = true;

            var _this = this;

            // Merge the data into cornernerstone (if annotation is not removed)
            // We can't simply change the object references because cornerstone
            // would lose link to the handles it's working on.

            /**
             * @descriptiopn
             * Deep clone src in target but keep target's references.
             * Make sure both src & target are references (object/array).
             */
            function homemadeClone(src, target) {
                // If we are dealing with arrays, should work too since
                // changing length will erase values.

                // Remove src keys absent from target
                for (var prop in target) {
                    if (!src.hasOwnProperty(prop)) {
                        delete target[prop];
                    }
                }

                // If src is an array, set the right length first (seems like
                // the length property is somehow not being taken in account
                // by the for loops). This is required because cornerstone will
                // ignore (don't draw) random tools' annotations if an array
                // has not a proper length (cf. equals to its item count).
                if (_.isArray(src)) {
                    // Assert
                    if (!_.isArray(target)) {
                        throw new Error('src and target should be the same type');
                    }

                    // Set the target array length
                    target.length = src.length;
                }

                // Copy src content in target
                for (var prop in src) {
                    // Copy null value first (just to make sure null is not
                    // considered as an object).
                    if (src[prop] === null) {
                        target[prop] = null;
                    }
                    // Go recursively through nested object
                    else if (_.isObject(src[prop]) && !_.isArray(src[prop])) {
                        // Create an object in target if none
                        if (!_.isObject(target[prop])) {
                            target[prop] = {};
                        }
                        // Go deep
                        homemadeClone(src[prop], target[prop]);
                    }
                    // Go recursively through nested array
                    else if (_.isArray(src[prop])) {
                        // Create an array in target if none
                        if (!_.isArray(target[prop])) {
                            target[prop] = [];
                        }
                        // Go deep
                        homemadeClone(src[prop], target[prop]);
                    }
                    // Copy directly every other kind of value
                    else {
                        target[prop] = src[prop];
                    }
                }
            }

            // Remove the data from cornerstone (if all the related annotations
            // are removed).
            if (!state && this.toolState[imageId] && this.toolState[imageId][toolName]) {
                delete this.toolState[imageId][toolName];
            }
            else {
                this.toolState[imageId] = this.toolState[imageId] || {};
                this.toolState[imageId][toolName] = this.toolState[imageId][toolName] || {};
                homemadeClone(state, this.toolState[imageId][toolName]);
            }

            if (redraw) {
                // refresh viewports
                var enabledElementObjects = cornerstone.getEnabledElementsByImageId(imageId);
                var csAnnotationSynchronizer = new osimis.CornerstoneAnnotationSynchronizer();
                enabledElementObjects
                    // Bypass thumbnails (as they wont ever be used w/ annotations)
                    .filter(function(enabledElementObject) {
                        return enabledElementObject._syncAnnotationResolution;
                    })
                    // Redraw the image - don't use cornerstone#draw because bugs occurs (only when debugger is off)
                    // those issues may come from changing the cornerstoneImageObject when image resolution change (cornerstone probably cache it)
                    .forEach(function(enabledElementObject) {
                        // Map annotation to current viewports' image qualities
                        // first.
                        var currentImageResolution = _.clone(enabledElementObject.viewport.currentImageResolution);
                        csAnnotationSynchronizer.syncByAnnotationType(toolName, _this.toolState[imageId][toolName], undefined, currentImageResolution);

                        // Then draw viewport.
                        var enabledElement = enabledElementObject.element;
                        cornerstone.updateImage(enabledElement, false); // Draw image. Do not invalidate cornerstone cache!
                        $(enabledElementObject.element).trigger("CornerstoneImageRendered", {
                            viewport: enabledElementObject.viewport,
                            element : enabledElementObject.element,
                            image : enabledElementObject.image,
                            enabledElement : enabledElementObject,
                            canvasContext: enabledElementObject.canvas.getContext('2d')
                        });
                    });
            }
        };
        cornerstoneTools.globalImageIdSpecificToolStateManager = toolStateManager;
    }
})();
