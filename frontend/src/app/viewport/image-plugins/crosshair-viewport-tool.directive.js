// hack: let's pass all usefull objects as global to avoid passing them in the toolState
var crossHairCornerstoneSynchronizer = new cornerstoneTools.Synchronizer("cornerstonenewimage", cornerstoneTools.updateImageSynchronizer);
var crossHairWvInstanceManager = undefined;
var crossHairWvPaneManager = undefined;
var crossHairWvSeriesManager = undefined;
var crossHairWvReferenceLines = undefined;
var crossHairWvSynchronizer = undefined;

(function($, cornerstone, cornerstoneTools) {

  'use strict';

  var toolType = 'crosshairsOsimis';

  function chooseLocation(e, eventData) {
      e.stopImmediatePropagation(); // Prevent CornerstoneToolsTouchStartActive from killing any press events
      
      // Get current element target information
      var sourceElement = e.currentTarget;
      var sourceEnabledElement = cornerstone.getEnabledElement(sourceElement);
      var sourceImage = sourceEnabledElement.image;
      var sourceImageId = sourceEnabledElement.image.imageId;
      var sourceImagePlane = cornerstoneTools.metaData.get('imagePlane', sourceImageId);

      // Get currentPoints from mouse cursor on selected element
      var sourceImagePoint = eventData.currentPoints.image;

      // Transfer this to a patientPoint given imagePlane metadata
      var patientPoint = cornerstoneTools.imagePointToPatientPoint(sourceImagePoint, sourceImagePlane);

      // Get the enabled elements associated with this synchronization context
      var enabledElements = crossHairCornerstoneSynchronizer.getSourceElements();

      // Iterate over each synchronized element
      $.each(enabledElements, function(index, targetElement) {
          // don't do anything if the target is the same as the source
          if (targetElement === sourceElement) {
              return; // Same as 'continue' in a normal for loop
          }

          var targetImage = cornerstone.getEnabledElement(targetElement).image;
          var targetImagePlane = cornerstoneTools.metaData.get('imagePlane', targetImage.imageId);

          // Make sure the target and reference actually have image plane metadata
          if (!targetImagePlane || !sourceImagePlane) {
            return;
          }

          // the image planes must be in the same frame of reference
          if (targetImagePlane.frameOfReferenceUID !== sourceImagePlane.frameOfReferenceUID) {
            return;
          }
      
          crossHairWvInstanceManager.getInfos(targetImage.imageId.split(":")[0]).then(function(targetInstanceInfos) {
            var targetPanes = crossHairWvPaneManager.getPanesDisplayingSeries(targetInstanceInfos["SeriesOrthancId"] + ":0");

            if (targetPanes.length > 0)  {

              var minDistance = Number.MAX_VALUE;
              var newImageIndex = -1;

              // Find within the element's stack the closest image plane to selected location
              $.each(targetPanes[0].series.imageIds, function(index, imageId) {
                  var targetImagePlane = cornerstoneTools.metaData.get('imagePlane', imageId);
                  var targetImagePosition = targetImagePlane.imagePositionPatient;
                  var row = targetImagePlane.rowCosines.clone();
                  var column = targetImagePlane.columnCosines.clone();
                  var normal = column.clone().cross(row.clone());
                  var distance = Math.abs(normal.clone().dot(targetImagePosition) - normal.clone().dot(patientPoint));
                  // console.log(index + '=' + distance);
                  if (distance < minDistance && distance <= targetImagePlane.sliceThickness) {
                      minDistance = distance;
                      newImageIndex = index;
                  }
              });

              $.each(targetPanes, function(index, targetPane) {
                // console.log("changing displayed image in series: " + targetPane.series.id + " to " + newImageIndex);
                targetPane.series.goToImage(newImageIndex);
                crossHairWvSynchronizer.update(targetPane.series);
                crossHairWvReferenceLines.update(targetPane.series, false);
              });
            }
          });
          crossHairWvInstanceManager.getInfos(sourceImage.imageId.split(":")[0]).then(function(sourceInstanceInfos) {
            var sourcePane = crossHairWvPaneManager.getPanesDisplayingSeries(sourceInstanceInfos["SeriesOrthancId"] + ":0")[0];
            crossHairWvReferenceLines.update(sourcePane.series, true);
          });
          

      });
  }

  function mouseUpCallback(e, eventData) {
      $(eventData.element).off('CornerstoneToolsMouseDrag', mouseDragCallback);
      $(eventData.element).off('CornerstoneToolsMouseUp', mouseUpCallback);
  }

  function mouseDownCallback(e, eventData) {
      if (cornerstoneTools.isMouseButtonEnabled(eventData.which, e.data.mouseButtonMask)) {
          $(eventData.element).on('CornerstoneToolsMouseDrag', mouseDragCallback);
          $(eventData.element).on('CornerstoneToolsMouseUp', mouseUpCallback);
          chooseLocation(e, eventData);
          return false; // false = cases jquery to preventDefault() and stopPropagation() this event
      }
  }

  function mouseDragCallback(e, eventData) {
      chooseLocation(e, eventData);
      return false; // false = causes jquery to preventDefault() and stopPropagation() this event
  }

  function activate(element, mouseButtonMask, wvInstanceManager, wvReferenceLines, wvSynchronizer, wvSeriesManager, wvPaneManager) {
    enable(element, mouseButtonMask, wvInstanceManager, wvReferenceLines, wvSynchronizer, wvSeriesManager, wvPaneManager)
  }

  function enable(element, mouseButtonMask, wvInstanceManager, wvReferenceLines, wvSynchronizer, wvSeriesManager, wvPaneManager) {
      var eventData = {
          mouseButtonMask: mouseButtonMask,
      };
      
      // set the reference to all global objects
      if (crossHairWvInstanceManager === undefined) {
        crossHairWvInstanceManager = wvInstanceManager;
        crossHairWvPaneManager = wvPaneManager;
        crossHairWvSeriesManager = wvSeriesManager;
        crossHairWvReferenceLines = wvReferenceLines;
        crossHairWvSynchronizer = wvSynchronizer;
      }

      $(element).off('CornerstoneToolsMouseDown', mouseDownCallback);
      $(element).on('CornerstoneToolsMouseDown', eventData, mouseDownCallback);
  }

  function deactivate(element) {
    disable(element);
  }
  // disables the reference line tool for the given element
  function disable(element) {
      $(element).off('CornerstoneToolsMouseDown', mouseDownCallback);
  }

  // module/private exports
  cornerstoneTools.crosshairsOsimis = {
      activate: activate,
      deactivate: deactivate,
      enable: enable,
      disable: disable
  };

  function dragEndCallback(e, eventData) {
      $(eventData.element).off('CornerstoneToolsTouchDrag', dragCallback);
      $(eventData.element).off('CornerstoneToolsDragEnd', dragEndCallback);
  }

  function dragStartCallback(e, eventData) {
      $(eventData.element).on('CornerstoneToolsTouchDrag', dragCallback);
      $(eventData.element).on('CornerstoneToolsDragEnd', dragEndCallback);
      chooseLocation(e, eventData);
      return false;
  }

  function dragCallback(e, eventData) {
      chooseLocation(e, eventData);
      return false; // false = causes jquery to preventDefault() and stopPropagation() this event
  }

  function enableTouch(element) {

      $(element).off('CornerstoneToolsTouchStart', dragStartCallback);
      $(element).on('CornerstoneToolsTouchStart', dragStartCallback);
  }

  // disables the reference line tool for the given element
  function disableTouch(element) {
      $(element).off('CornerstoneToolsTouchStart', dragStartCallback);
  }

  cornerstoneTools.crosshairsOsimisTouch = {
      activate: enableTouch,
      deactivate: disableTouch,
      enable: enableTouch,
      disable: disableTouch
  };

})($, cornerstone, cornerstoneTools);

(function () {
  'use strict';

  angular
    .module('webviewer')
    .directive('wvCrossHairViewportTool', wvCrossHairViewportTool)
    .config(function ($provide) {
      $provide.decorator('wvViewportDirective', function ($delegate) {
        var directive = $delegate[0];
        directive.require['wvCrossHairViewportTool'] = '?^wvCrossHairViewportTool';

        return $delegate;
      });
    });

  /* @ngInject */
  function wvCrossHairViewportTool($parse, WvBaseTool, wvInstanceManager, wvReferenceLines, wvSynchronizer, wvSeriesManager, wvPaneManager) {
    // Usage:
    //
    // Creates:
    //
    var directive = {
      require: 'wvCrossHairViewportTool',
      controller: Controller,
      link: link,
      restrict: 'A',
      scope: false
    };

    function link(scope, element, attrs, tool) {
      var wvCrossHairViewportToolParser = $parse(attrs.wvCrossHairViewportTool);


      // bind attributes -> tool
      scope.$watch(wvCrossHairViewportToolParser, function (isActivated) {
        if (isActivated) {
          tool.activate();
        }
        else {
          tool.deactivate();
        }
      });
    }

    /* @ngInject */
    function Controller(wvPanViewportTool, wvZoomViewportTool, $scope) {
      WvBaseTool.call(this, 'crosshairsOsimis', 'crosshairsOsimisTouch', false, wvPanViewportTool, wvZoomViewportTool, $scope);

    }
    Controller.prototype = Object.create(WvBaseTool.prototype)
    Controller.prototype.constructor = Controller;

    Controller.prototype._activateInputsInternal = function (enabledElement) {
      crossHairCornerstoneSynchronizer.add(enabledElement);
      cornerstoneTools[this.toolName].activate(enabledElement, 1, wvInstanceManager, wvReferenceLines, wvSynchronizer, wvSeriesManager, wvPaneManager);
      if (this.toolName2) {
        cornerstoneTools[this.toolName2].activate(enabledElement);
      }

    }

    Controller.prototype._deactivateInputsInternal = function (enabledElement) {
      crossHairCornerstoneSynchronizer.remove(enabledElement);

      cornerstoneTools[this.toolName].disable(enabledElement);
      if (this.toolName2) {
        cornerstoneTools[this.toolName2].disable(enabledElement);
      }
    };

    return directive;
  }

})();