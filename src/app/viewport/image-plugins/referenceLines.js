/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.ReferenceLines
 *
 * @description
 */
(function (osimis) {
  'use strict';

  function ReferenceLines(Promise, wvPaneManager, wvInstanceManager, wvSeriesManager) {
    // Injections.
    this._Promise = Promise;
    this._wvPaneManager = wvPaneManager;

    this._wvInstanceManager = wvInstanceManager;
    this._wvSeriesManager = wvSeriesManager;
    this._enabled = true;
    this._lastUpdatedSeries = null;
    this._seriesInfosByInstanceId = {};
    this.onReferenceLineStatusUpdated = new osimis.Listener();
  }

  ReferenceLines.prototype.enable = function (enabled) {
    this._enabled = enabled;

    var that = this;
    var allPanes = this._wvPaneManager.getAllPanes();
    $.each(allPanes, function (index, pane) {
      if (pane.series != undefined) {
        that.update(pane.series, false);
      }
    });

    if (this._enabled) {
      console.log("ReferenceLines is now enabled");
    } else {
      console.log("ReferenceLines is now disabled");
    }
    this.triggerOnReferenceLineStatusUpdated();
  }

  ReferenceLines.prototype.toggle = function () {
    this.enable(!this._enabled);
  }



  ReferenceLines.prototype.isEnabled = function () {
    return this._enabled;
  }

  ReferenceLines.prototype.getListOfReferencingPanes = function (series) {
    var toReturn = [];
    var panes = this._wvPaneManager.getAllPanes();

    if (panes.length > 1 && series.hasSlices()) {
      for (var i = 0; i < panes.length; ++i) {
        if (panes[i].seriesId !== undefined && panes[i].seriesId != series.id && panes[i].series.hasSlices()) {

          if (panes[i].series.isSameFrameOfReference(series)) {
            toReturn.push(panes[i]);
          }
        }
      }
    }

    return toReturn;
  }

  ReferenceLines.prototype.renderReferenceLine = function (context, eventData, targetElement, referenceImagePlane) {

    var targetImage = cornerstone.getEnabledElement(targetElement).image;

    var targetImagePlane = cornerstoneTools.metaData.get('imagePlane', targetImage.imageId);

    // Make sure the target and reference actually have image plane metadata
    if (!targetImagePlane || !referenceImagePlane) {
      return;
    }

    // the image planes must be in the same frame of reference
    if (targetImagePlane.frameOfReferenceUID !== referenceImagePlane.frameOfReferenceUID) {
      return;
    }

    // the image plane normals must be > 30 degrees apart
    var targetNormal = targetImagePlane.rowCosines.clone().cross(targetImagePlane.columnCosines);
    var referenceNormal = referenceImagePlane.rowCosines.clone().cross(referenceImagePlane.columnCosines);
    var angleInRadians = targetNormal.angleTo(referenceNormal);

    angleInRadians = Math.abs(angleInRadians);
    if (angleInRadians < 0.5) { // 0.5 radians = ~30 degrees
      return;
    }

    var referenceLine = cornerstoneTools.referenceLines.calculateReferenceLine(targetImagePlane, referenceImagePlane);
    if (!referenceLine) {
      return;
    }

    var refLineStartCanvas = cornerstone.pixelToCanvas(eventData.element, referenceLine.start);
    var refLineEndCanvas = cornerstone.pixelToCanvas(eventData.element, referenceLine.end);

    var color = cornerstoneTools.toolColors.getActiveColor();
    var lineWidth = cornerstoneTools.toolStyle.getToolWidth();

    // draw the referenceLines
    context.save();
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.moveTo(refLineStartCanvas.x, refLineStartCanvas.y);
    context.lineTo(refLineEndCanvas.x, refLineEndCanvas.y);
    context.stroke();
    context.restore();

  }

  ReferenceLines.prototype.onImageRendered = function (e, eventData) {

    if (!this._enabled) {
      return false;
    }

    var instanceId = eventData.image.imageId.split(":")[0];
    var that = this;
    var series = that._seriesInfosByInstanceId[instanceId];

    if (series === undefined) {
      return;
    }

    if (this._lastUpdatedSeries != null && this._lastUpdatedSeries.id == series.id) {
      // console.log("not rendering reference lines on the currently selected series ", series.id);
      return;
    } else {
      // console.log("rendering reference lines series ", series.id);
    }

    var referencePanes = that.getListOfReferencingPanes(series); // [e.currentTarget]; // syncContext.getSourceElements();

    if (referencePanes !== undefined && referencePanes.length > 0) {
      // Create the canvas context and reset it to the pixel coordinate system
      var context = eventData.canvasContext.canvas.getContext('2d');
      context.setTransform(1, 0, 0, 1, 0, 0);

      var color = cornerstoneTools.toolColors.getActiveColor();
      var lineWidth = cornerstoneTools.toolStyle.getToolWidth();

      //cornerstone.setToPixelCoordinateSystem(eventData.enabledElement, context);

      // Iterate over each referenced element
      $.each(referencePanes, function (index, referencePane) {

        var imageId = referencePane.series.getCurrentImageId();
        if (imageId != null) {
          // console.log("rendering line from ", imageId, " on ", eventData.image.imageId);

          var referenceImagePlane = cornerstoneTools.metaData.get('imagePlane', imageId);
          that.renderReferenceLine(context, eventData, e.currentTarget, referenceImagePlane);
        }
      });

    }

  }


  ReferenceLines.prototype.update = function (updatedSeries, updateCurrentSelectedSeries) {
    if (updatedSeries == null || updatedSeries.getCurrentImageId() == null) { // this can happen when the synchronizer updates the reference lines
      return;
    }

    if (updateCurrentSelectedSeries === undefined || updateCurrentSelectedSeries) {
      this._lastUpdatedSeries = updatedSeries;
      //      console.log("updating ", updatedSeries.id);
    }

    var instanceId = updatedSeries.getCurrentImageId().split(":")[0];
    this._seriesInfosByInstanceId[instanceId] = updatedSeries;

    var referencePanes = this.getListOfReferencingPanes(updatedSeries);

    $.each(referencePanes, function (index, referencePane) {

      var imageId = referencePane.series.getCurrentImageId();
      // console.log("ReferenceLines.update, need to redraw ", imageId);
      var enabledElementObjects = cornerstone.getEnabledElementsByImageId(imageId);
      enabledElementObjects
        // Bypass thumbnails (as they wont ever be used w/ annotations)
        .filter(function (enabledElementObject) {
          return enabledElementObject._syncAnnotationResolution;
        })
        // Redraw the image - don't use cornerstone#draw because bugs occurs (only when debugger is off)
        // those issues may come from changing the cornerstoneImageObject when image resolution change (cornerstone probably cache it)
        .forEach(function (enabledElementObject) {

          // console.log("ReferenceLines.update, redrawing ", imageId);
          // Then draw viewport.
          var enabledElement = enabledElementObject.element;
          cornerstone.updateImage(enabledElement, false); // Draw image. Do not invalidate cornerstone cache!
        });

    });

    this.triggerOnReferenceLineStatusUpdated();
  }

  ReferenceLines.prototype.triggerOnReferenceLineStatusUpdated = function () { // mainly used by the Liveshare to synchronize state

    var status = {
      enabled: this._enabled,
      lastUpdatedSeriesId: (this._lastUpdatedSeries != null ? this._lastUpdatedSeries.id : null),
      seriesIdByInstanceId: {}
    };
    var that = this;
    Object.keys(this._seriesInfosByInstanceId).forEach(function (instanceId) {
      status.seriesIdByInstanceId[instanceId] = that._seriesInfosByInstanceId[instanceId].id;
    })
    this.onReferenceLineStatusUpdated.trigger(status);
  }

  ReferenceLines.prototype.restoreReferenceLineStatus = function (status) { // mainly used by the Liveshare to synchronize state
    if (Object.keys(status).length >= 3) {  // wait until the status has been initialized 
      this._enabled = status.enabled;
      this._lastUpdatedSeriesId = status.lastUpdatedSeries;

      var that = this;
      Object.keys(status.seriesIdByInstanceId).forEach(function (instanceId) {
        that._wvSeriesManager.get(status.seriesIdByInstanceId[instanceId]).then(function (series) {
          that._seriesInfosByInstanceId[instanceId] = series;
        })
      })

      // update all reference lines
      Object.keys(this._seriesInfosByInstanceId).forEach(function (instanceId) {
        that.update(that._seriesInfosByInstanceId[instanceId], status.lastUpdatedSeriesId == that._seriesInfosByInstanceId[instanceId].id);
      })
    }
  }
  angular
    .module('webviewer')
    .factory('wvReferenceLines', wvReferenceLines);

  /* @ngInject */
  function wvReferenceLines($q, wvPaneManager, wvInstanceManager, wvSeriesManager) {
    return new ReferenceLines($q, wvPaneManager, wvInstanceManager, wvSeriesManager);
  }
})(osimis || (this.osimis = {}));