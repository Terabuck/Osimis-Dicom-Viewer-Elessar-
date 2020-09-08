/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.BaseTool
 *
 * @description
 * Base class to implement an viewport tool in the form of an attribute
 * directive based on the cornerstoneTools implementation. It provides helpers
 * to bind the attribute-directive tool to a viewport directive and to
 * poll annotation changes in the viewport from the global CornerstoneTool data
 * object in realtime.
 *
 * @rationale
 * Early requirement was to be able to develop different tools in WVB and WVP.
 * Thus, we decided to separate each tool's logic and to bind them to the 
 * viewport using AngularJS attribute directives.
 */
(function (osimis) {
  'use strict';

  function BaseTool(toolName, toolName2, isAnnotationTool, wvPanViewportTool, wvZoomViewportTool, $scope, useDefaultMiddleAndRightButtonBehaviour) {
    this.viewports = [];

    if (useDefaultMiddleAndRightButtonBehaviour === undefined) {
      useDefaultMiddleAndRightButtonBehaviour = true
    }
    this.useDefaultMiddleAndRightButtonBehaviour = useDefaultMiddleAndRightButtonBehaviour;
    this._hammersForMiddleAndRightButton = {};
    this.wvPanViewportTool = wvPanViewportTool;
    this.wvZoomViewportTool = wvZoomViewportTool;
    this.$scope = $scope;
    this.toolName = toolName;
    this.toolName2 = toolName2; // in case of additional mobile tool.
    this.isActivated = false;
    this.isAnnotationTool = (isAnnotationTool !== undefined && isAnnotationTool) || false;
    this.annotationTools = ["angle", "angleTouch", "simpleAngle", "simpleAngleTouch", "length", "lengthTouch", "probe", "probeTouch", "ellipticalRoi", "ellipticalRoiTouch", "rectangleRoi", "rectangleRoiTouch", "arrowAnnotate", "arrowAnnotateTouch"];
  }

  /**
   * @ngdoc method
   * @methodOf osimis.BaseTool
   *
   * @name osimis.BaseTool#register
   * 
   * @param {osimis.Viewport} viewport
   * The registered viewport class.
   *
   * @description
   * Method called by the viewport directive controller to be registered to 
   * this tool, so we can poll data out of it (see `#_listenViewChange`
   * method).
   */
  BaseTool.prototype.register = function (viewport) {
    var _this = this;

    this.viewports.push(viewport)

    // For tools related to cornerstone (@todo split BaseTool in AnnotationTools & others)
    if (cornerstoneTools[this.toolName] && this.isAnnotationTool) {
      // Set tool in enable mode (it's a 1D state machine with 4
      // states) - display annotations but ignore inputs.
      var enabledElement = viewport.getEnabledElement();
      cornerstoneTools[this.toolName].enable(enabledElement, 1);
    }

    this._listenModelChange(viewport);

    if (this.isActivated) {
      this.activate(viewport);
    }
  }

  /**
   * @ngdoc method
   * @methodOf osimis.BaseTool
   *
   * @name osimis.BaseTool#unregister
   * 
   * @param {osimis.Viewport} viewport
   * The unregistered viewport class.
   *
   * @description
   * Method called by the viewport directive controller to be unregistered 
   * from this tool, so we stop polling data out of the cornerstone viewport.
   */
  BaseTool.prototype.unregister = function (viewport) {
    // For tools related to cornerstone (@todo split BaseTool in AnnotationTools & others)
    if (cornerstoneTools[this.toolName]) {
      // Set tool in disable mode (it's a 1D state machine with 4
      // states) - don't display annotations & ignore inputs.
      // 1. Retrieve DOM element
      var enabledElement = viewport.getEnabledElement();
      // 2. Ignore exception if no image is shown in the viewport
      var isElementEnabled = undefined;
      try {
        isElementEnabled = true;
        cornerstone.getEnabledElement(enabledElement);
      }
      catch (exc) {
        isElementEnabled = false;
      }
      // 3. Change tool state
      if (isElementEnabled) {
        cornerstoneTools[this.toolName].enable(enabledElement, 1);
        if (this.toolName2) {
          cornerstoneTools[this.toolName2].activate(enabledElement);
        }
      }
    }

    this._unlistenModelChange(viewport);

    _.pull(this.viewports, viewport);
  };

  /**
   * @ngdoc method
   * @methodOf osimis.BaseTool
   *
   * @name osimis.BaseTool#_activateInputs
   * 
   * @param {osimis.Viewport} viewport
   * The viewport to activate inputs to.
   *
   * @description
   * Let CornerstoneTools listen and react to mouse (& touch) inputs. Once
   * this method has been called, annotations are drawn in reaction to user
   * events.
   */
  BaseTool.prototype._activateInputs = function (viewport) {
    // Listen to events
    var enabledElement = viewport.getEnabledElement();
    cornerstoneTools.mouseInput.enable(enabledElement);
    cornerstoneTools.touchInput.enable(enabledElement);

    if (this.isAnnotationTool) {
      //console.log("deactivating all annotation tools (make the annotation editable but not active)", this.annotationTools);
      this.annotationTools.forEach(function (value) { cornerstoneTools[value].deactivate(enabledElement, 1) });
    }

    this._activateInputsInternal(enabledElement);
    // // Set tool in activate mode (it's a 1D state machine with 4
    // // states) - display annotations and listen to inputs.
    // cornerstoneTools[this.toolName].activate(enabledElement, 1);
    // if (this.toolName2) {
    //   cornerstoneTools[this.toolName2].activate(enabledElement);
    // }

    if (this.useDefaultMiddleAndRightButtonBehaviour) {
      cornerstoneTools["zoomTouchPinch"].activate(enabledElement, 1);  // always activate zoomTouchPinch (for all tools)
      this._hammersForMiddleAndRightButton[viewport] = {};
      this._hammersForMiddleAndRightButton[viewport]["twoTouchPan"] = new osi.HammerWrapper(enabledElement, 2, viewport, "pan", this.wvWindowingViewportTool, this.wvPanViewportTool);

      // install mouse handler
      var $enabledElement = $(viewport.getEnabledElement());
      var that = this;

      $enabledElement.on('mousedown.combinedTool', function (e) {
        var isTouchEvent = !e.pageX && !e.pageY && !!e.originalEvent.touches;
        var mouseButton = !isTouchEvent ? e.which : 1;
        var lastX = !isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX;
        var lastY = !isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY;

        $(document).one('mouseup', function (e) {
          $(document).unbind('mousemove.combinedTool');
        });

        $(document).on('mousemove.combinedTool', function (e) {
          // Prevent issues on touchscreens.
          e.preventDefault();

          that.$scope.$apply(function () {  // @todo necessary ?
            var deltaX = (!isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX) - lastX;
            var deltaY = (!isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY) - lastY;
            lastX = !isTouchEvent ? e.pageX : e.originalEvent.touches[0].pageX;
            lastY = !isTouchEvent ? e.pageY : e.originalEvent.touches[0].pageY;

            if (mouseButton === 2) { // middle-click + move
              that.wvPanViewportTool.applyPanToViewport(viewport, deltaX, deltaY);
            }
            else if (mouseButton === 3) { // right-click + move
              that.wvZoomViewportTool.applyZoomToViewport(viewport, deltaY);
            }
          });
        });
      });
    }
  };


  BaseTool.prototype._activateInputsInternal = function (enabledElement) {
    // Set tool in activate mode (it's a 1D state machine with 4
    // states) - display annotations and listen to inputs.
    cornerstoneTools[this.toolName].activate(enabledElement, 1);
    if (this.toolName2) {
      cornerstoneTools[this.toolName2].activate(enabledElement);
    }
  };

  /**
   * @ngdoc method
   * @methodOf osimis.BaseTool
   *
   * @name osimis.BaseTool#_deactivateInputs
   * 
   * @param {osimis.Viewport} viewport
   * The viewport to deactivate inputs from.
   *
   * @description
   * Ask CornerstoneTools to stop listening/reacting to mouse (& touch) 
   * inputs. Once this method has been called, annotations are no longer
   * drawn in reaction to user events.
   */
  BaseTool.prototype._deactivateInputs = function (viewport) {
    // Unlisten to events
    var enabledElement = viewport.getEnabledElement();
    cornerstoneTools.mouseInput.disable(enabledElement);
    cornerstoneTools.touchInput.disable(enabledElement);

    if (this.isAnnotationTool) {
      // console.log("enabling all annotation tools (display the annotations but make them readonly)", this.annotationTools);
      this.annotationTools.forEach(function (value) { cornerstoneTools[value].enable(enabledElement, 1) });
    }

    this._deactivateInputsInternal(enabledElement);

    if (this.useDefaultMiddleAndRightButtonBehaviour) {
      cornerstoneTools["zoomTouchPinch"].disable(enabledElement);

      // Remove touch handlers
      for (var action in this._hammersForMiddleAndRightButton[viewport]) {
        this._hammersForMiddleAndRightButton[viewport][action].destroy();
      }
      delete this._hammersForMiddleAndRightButton[viewport];

      // Remove mouse handlers
      var $enabledElement = $(viewport.getEnabledElement());
      $enabledElement.off('mousedown.combinedTool');
    }

  };

  BaseTool.prototype._deactivateInputsInternal = function (enabledElement) {
    if (!this.isAnnotationTool) {
      // Set tool in disabled mode (it's a 1D state machine with 4
      // states) - display annotations but ignore inputs.
      cornerstoneTools[this.toolName].disable(enabledElement);
      if (this.toolName2) {
        cornerstoneTools[this.toolName2].disable(enabledElement);
      }
    }
  };
  /**
   * @ngdoc method
   * @methodOf osimis.BaseTool
   *
   * @name osimis.BaseTool#_listenModelChange
   * 
   * @param {osimis.Viewport} viewport
   * The cornerstone viewport to bind the osimis web viewer annotation model
   * to.
   *
   * @description
   * Each time the annotations change in the Osimis Web Viewer Annotation
   * Model, this method propagates these changes to the CornerstoneTool
   * annotation global model and redraw the viewport.
   */
  var _imageByViewportListenerIds = [];
  BaseTool.prototype._listenModelChange = function (viewport) {
    var _this = this;

    var toolName = this.toolName;
    var enabledElement = viewport.getEnabledElement();
    var toolStateManager = cornerstoneTools.getElementToolStateManager(enabledElement);

    var currentImage = viewport.getImage();

    // load tool data in cornerstone elements
    var annotation = currentImage.getAnnotations(_this.toolName);
    if (annotation) {
      toolStateManager.restoreStateByToolAndImageId(annotation.type, annotation.imageId, annotation.data, false);//false?
    }

    // listen to the new image model changes
    currentImage.onAnnotationChanged([_this, viewport], function (annotation) {
      // Filter out annotations that are not concerned by this tool
      if (annotation.type !== _this.toolName) return;

      // Restore annotations in cornerstone
      toolStateManager.restoreStateByToolAndImageId(annotation.type, annotation.imageId, annotation.data, true);
    });

    // onImageChanging is used instead of onImageChanged to avoid useless repaint
    // as the toolStateManager.restoreStateByToolAndImageId does redraw the image
    viewport.onImageChanging(this, function (newImage, oldImage) {
      // close old image listeners
      if (oldImage) {
        oldImage.onAnnotationChanged.close([_this, viewport]);
      }

      // load tool data in cornerstone elements
      var annotation = newImage.getAnnotations(_this.toolName);
      if (annotation) {
        toolStateManager.restoreStateByToolAndImageId(annotation.type, annotation.imageId, annotation.data, false);
      }

      // listen to the new image model changes
      newImage.onAnnotationChanged([_this, viewport], function (annotation) {
        // Filter out annotations that are not concerned by this tool
        if (annotation.type !== _this.toolName) return;

        // Restore annotations in cornerstone
        toolStateManager.restoreStateByToolAndImageId(annotation.type, annotation.imageId, annotation.data, true);
      });
    });
  };

  /**
   * @ngdoc method
   * @methodOf osimis.BaseTool
   *
   * @name osimis.BaseTool#_unlistenModelChange
   * 
   * @param {osimis.Viewport} viewport
   * The cornerstone viewport from which we want to unbind the osimis web 
   * viewer annotation model.
   *
   * @description
   * Stop propagating changes from the Osimis Web Viewer Annotation Model to
   * the CornerstoneTool one.
   */
  BaseTool.prototype._unlistenModelChange = function (viewport) {
    var image = viewport.getImage();
    if (image) {
      image.onAnnotationChanged.close([this, viewport]);
    }

    viewport.onImageChanging.close(this);
  };

  /**
   * @ngdoc method
   * @methodOf osimis.BaseTool
   *
   * @name osimis.BaseTool#_unlistenModelChange
   * 
   * @param {osimis.Viewport} viewport
   * The cornerstone viewport from which we want to stop polling
   * CornerstoneTools annotations.
   *
   * @description
   * Stop polling changes from the CornerstoneTool Annotation Model to
   * the Osimis Web Viewer's one.
   */
  BaseTool.prototype._unlistenViewChange = function (viewport) {
    var enabledElement = viewport.getEnabledElement();

    if (this.isAnnotationTool) {
      this.annotationTools.forEach(function (toolName) { $(enabledElement).off('CornerstoneImageRendered.' + toolName); });
    } else {
      $(enabledElement).off('CornerstoneImageRendered.' + this.toolName);
    }
  };

  BaseTool.prototype._process = function (viewport) { };
  BaseTool.prototype._unprocess = function (viewport) { };

  /**
   * @ngdoc method
   * @methodOf osimis.BaseTool
   *
   * @name osimis.BaseTool#activate
   * 
   * @param {osimis.Viewport} [viewport]
   * The viewport we which to activate the tool on. When not set, we activate
   * the tool for all the registered viewports (see the `#register` method).
   *
   * @description
   * Activate the tool for a specific or all the registered viewports. When
   * a tool is activated, the user can use it to modify/create annotations.
   * However, the tool is not required to be activated for annotation to be
   * shown. Thus, we can display a tool's annotations but make them readonly
   * (rely only on `#register` method for readonly behavior).
   */
  BaseTool.prototype.activate = function (viewport) {
    if (typeof viewport === 'undefined') {
      // apply to every viewports
      this.viewports.forEach(this.activate.bind(this));
      this.isActivated = true;
    }
    else {
      var enabledElement = viewport.getEnabledElement();

      this._process(viewport);
      this._activateInputs(viewport);
      this._listenViewChange(viewport);
    }
  };

  /**
   * @ngdoc method
   * @methodOf osimis.BaseTool
   *
   * @name osimis.BaseTool#deactivate
   *
   * @description
   * Deactivate the current tool for all the registered viewports. The user
   * can no longer use it to edit/create annotations, although they are still
   * displayed.
   */
  BaseTool.prototype.deactivate = function () {
    var _this = this;
    this.viewports.forEach(function (viewport) {
      _this._unlistenViewChange(viewport);
      _this._deactivateInputs(viewport);
      _this._unprocess(viewport);
    });

    this.isActivated = false;
  };

  osimis.BaseTool = BaseTool;

  // Inject in AngularJs
  angular
    .module('webviewer')
    .factory('WvBaseTool', factory);

  /* @ngInject */
  function factory($rootScope) {

    /**
     * @ngdoc method
     * @methodOf osimis.BaseTool
     *
     * @name osimis.BaseTool#_listenViewChange
     * 
     * @param {osimis.Viewport} viewport
     * The cornerstone viewport from which we want to poll CornerstoneTools 
     * annotations into our own Osimis Web Viewer Annotation Model.
     *
     * @description
     * Poll the CornerstoneTool global annotation object. Propagate changes
     * in our own Annotation Model. The polling occurs every 20ms, but only
     * when the CornerstoneJS canvas is being redrawn.
     * 
     * @todo Move this method out of the AngularJS factory.
     */
    osimis.BaseTool.prototype._listenViewChange = function (viewport) {
      var _this = this;
      var enabledElement = viewport.getEnabledElement();
      var toolStateManager = cornerstoneTools.getElementToolStateManager(enabledElement);

      // For the specified cornerstone viewport, listen to rendered
      // events..
      function installCornerstoneImageRenderedHandler(toolName) {
        $(enabledElement).on('CornerstoneImageRendered.' + toolName, _.throttle(function () {
          var image = viewport.getImage();

          if (!image) {
            return;
          }

          var newAnnotationsData = toolStateManager.getStateByToolAndImageId(toolName, image.id);
          var oldAnnotations = image.getAnnotations(toolName);

          // As update checks are made on each CornerstoneImageRendered
          // don't trigger update if the newAnnotations hasn't changed
          // this would be way too slow otherwise The handles visibility
          // is compared as well (highlight & active properties) - for
          // livesharing purpose.
          if (oldAnnotations && _.isEqual(newAnnotationsData, oldAnnotations.data)) return;

          // Avoid having to use angular deep $watch using a fast
          // shallow object clone.
          var data = _.clone(newAnnotationsData);

          // Ignore the BaseTool onAnnotationChanged listening to
          // avoid dual annotation draw (the annotations are already
          // drawn). The onAnnotationChanged will still be listened
          // by other observers.
          image.onAnnotationChanged.ignore([_this, viewport], function () {
            if (data && data.data.length) {
              // Store current image resolution in annotations
              data.data.forEach(function (data) {
                if (data) {
                  data.imageResolution = {
                    width: viewport._displayedCornerstoneImageObject.width,
                    height: viewport._displayedCornerstoneImageObject.height
                  };
                }
              });

              // Store annotations
              image.setAnnotations(toolName, data, true);
            }
            else if (data && !data.data.length) {
              // remove empty annotation
              image.setAnnotations(toolName, null, true);
            }
          });
        }, 20));
      }

      if (this.isAnnotationTool) {
        this.annotationTools.forEach(function (toolName) { installCornerstoneImageRenderedHandler(toolName); });
      } else {
        installCornerstoneImageRenderedHandler(this.toolName);
      }


    };

    return osimis.BaseTool;
  }

})(this.osimis || (this.osimis = {}));
