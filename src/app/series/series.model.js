/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.Series
 *
 * @description
 * The `Series` model represent a series of images. It does not map the DICOM
 * series, as it only represents images, either comming from a list of frame of
 * a DICOM multi-frame instance or from a DICOM mono-frame instance.
 *
 * The `Series` model provides helper to play the series, change the shown
 * image, retrieve the currently shown image, aso.
 */
(function () {
  'use strict';

  angular
    .module('webviewer')
    .factory('WvSeries', factory);

  /* @ngInject */
  function factory($rootScope, $timeout, wvImageManager, wvAnnotationManager, WvAnnotationGroup, wvImageBinaryManager, uaParser) {

    function WvSeries(id, studyId, imageIds, pdfIds, tags, availableQualities) {
      var _this = this;

      // Replace PixelData by lossless in safari & internet explorer (for decompression library incompatibility reasons)
      if (uaParser.getBrowser().name.indexOf('Safari') !== -1
        || uaParser.getBrowser().name.indexOf('IE') !== -1
        || uaParser.getBrowser().name.indexOf('Edge') !== -1
        && availableQualities.hasOwnProperty('PIXELDATA')) {
        // @todo Check with edge if this may be disabled (& in latest Safari versions)
        console.warn && console.warn('Transtypage of PIXELDATA to PNG for of Safari & IE -> Much slower decompression');
        delete availableQualities.PIXELDATA;
        availableQualities.LOSSLESS = osimis.quality.LOSSLESS;
      }

      this.id = id; // id == orthancId + ':' + subSeriesIndex
      this.studyId = studyId;
      this.imageIds = imageIds;
      this.imageCount = imageIds.length;
      this.currentIndex = 0; // real index of the image, waiting loading to be shown
      this.currentShownIndex = 0; // index shown at the moment
      // @warning Those are all the tags of the middle instance of the orthanc series!
      // Multiframe instance may cause mismatch since one orthanc multiframe instance is one frontend series.
      // For instance we can't rely on this for framerate but only on tags common to an orthanc series.
      this.tags = tags;
      this.availableQualities = availableQualities;
      this.onCurrentImageIdChanged = new osimis.Listener();
      this.onAnnotationChanged = new osimis.Listener();

      // Set the framerate
      setTimeout(function () {
        _this.frameRate = 30; // 30 FPS by default
        // Retrieve the image from the center of the series (to be sure the framerate is defined)
        var middleImageId = _this.imageIds[Math.floor(_this.imageIds.length / 2)];

        // Put the request within a $timeout since the imageManager requires the series to be loaded
        // for optimization reason, and the series requires the image to be loaded to gather
        // its DICOM tag.
        // It is a temporary fix due to the osimis-viewer series requests returning the tags
        // of the middle instance of an orthanc series.
        // Due to the multiframe DICOM instance differences with monoframe DICOM instances, 
        // osimis-viewer uses an alternative model working for both.
        // @todo series route should return the tags of the middle instance of a osimis-viewer series instead
        wvImageManager
          .get(middleImageId)
          .then(function (image) {
            if (image.instanceInfos.TagsSubset.RecommendedDisplayFrameRate) {
              _this.frameRate = +image.instanceInfos.TagsSubset.RecommendedDisplayFrameRate; // make sure it's a number so input numbers referencing this var don't throw errors
            }
          });
      });

      // @note _annotationGroup is just a local cache for filtering
      // the real cache is handled by the wvAnnotationManager service
      this._annotationGroup = null;
      // invalidate cache on change
      wvAnnotationManager.onAnnotationChanged(function (annotation) {
        if (_this.imageIds.indexOf(annotation.imageId) !== -1) {
          // invalidate the cache if the series is concerned by the changed annotation
          _this._annotationGroup = null;

          // trigger the change
          _this.onAnnotationChanged.trigger(annotation);
        }
      });
      // @todo unlisten

      this.isPlaying = false;
      this._playTimeout = null;
    };

    /** WvSeries#listInstanceIds()
     *
     * List instances (and not images)
     *
     * @return {array} [instanceId: String, ...]
     *
     */
    WvSeries.prototype.listInstanceIds = function () {
      var instanceIds = [];
      var previousInstanceId = null;

      // Take instanceIds from imageIds
      // @note this._imageIds is sorted
      for (var i = 0; i < this.imageIds.length; ++i) {
        var imageId = this.imageIds[i];
        var splittedId = imageId.split(':');
        var instanceId = splittedId[0];

        if (instanceId === previousInstanceId) {
          continue;
        }
        else {
          instanceIds.push(instanceId);
          previousInstanceId = instanceId;
        }
      }

      return instanceIds;
    };

    /** WvSeries#hasQuality(quality: int)
     *
     * @return bool
     *
     */
    WvSeries.prototype.hasQuality = function (quality) {
      // Seek quality in this.availableQualities
      for (var name in this.availableQualities) {
        var availableQuality = this.availableQualities[name];
        if (availableQuality === quality) {
          return true;
        }
      }

      // Quality not found
      return false;
    };

    /** WvSeries#getCachedImageBinaries()
     *
     * @return [<image-index>: [<quality-value>, ...], ...]
     *
     */
    WvSeries.prototype.listCachedImageBinaries = function () {
      var _this = this;

      // For each image of the series -> list binaries in cache
      return this.imageIds
        .map(function (imageId, imageIndex) {
          return wvImageBinaryManager.listCachedBinaries(imageId);
        });
    };

    WvSeries.prototype.getAnnotedImageIds = function (type) {
      return this._loadAnnotationGroup()
        .filterByType(type)
        .getImageIds();
    };

    WvSeries.prototype.getAnnotationGroup = function (type) {
      return this._loadAnnotationGroup();
    };

    /** $series.getAnnotations([type: string])
     *
     */
    WvSeries.prototype.getAnnotations = function (type) {
      var annotationGroup = this._loadAnnotationGroup();

      if (type) {
        annotationGroup.filterByType(type);
      }

      return annotationGroup.toArray();
    };

    WvSeries.prototype.getIndexOf = function (imageId) {
      return this.imageIds.indexOf(imageId);
    }

    WvSeries.prototype.setShownImage = function (id) {
      this.currentShownIndex = this.getIndexOf(id);
    };
    WvSeries.prototype.getCurrentImageId = function () {
      if (this.currentIndex >= 0 && this.currentIndex < this.imageIds.length) {
        return this.imageIds[this.currentIndex];
      } else {
        return null;
      }
    };

    WvSeries.prototype.getCurrentImagePromise = function () {
      var imageId = this.getCurrentImageId();
      return wvImageManager.get(imageId);
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Series
     * 
     * @name osimis.Series#getImageByIndex
     * 
     * @param {number} index
     * The index of the image within the series.
     *
     * @return {Promise<osimis.Image>}
     * Returns a promise with the image model of the series'
     * <index>th image.
     *
     * @description
     * Retrieve an image model based on its index within the series.
     */
    WvSeries.prototype.getImageByIndex = function (index) {
      var imageId = this.imageIds[index];
      return wvImageManager.get(imageId);
    };

    WvSeries.prototype.goToNextImage = function (restartWhenSeriesEnd) {
      restartWhenSeriesEnd = restartWhenSeriesEnd || false;

      if (this.currentIndex >= this.imageCount - 1 && restartWhenSeriesEnd) {
        this.currentIndex = 0;
        this.onCurrentImageIdChanged.trigger(this.getCurrentImageId(), this.setShownImage.bind(this));
      }
      else if (this.currentIndex < this.imageCount - 1) {
        this.currentIndex++;
        this.onCurrentImageIdChanged.trigger(this.getCurrentImageId(), this.setShownImage.bind(this));
      }
      else {
        // Don't trigger event when nothing happens (the series is already at its end)
      }
    };

    WvSeries.prototype.goToPreviousImage = function (restartWhenSeriesEnd) {
      restartWhenSeriesEnd = restartWhenSeriesEnd || false;

      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.onCurrentImageIdChanged.trigger(this.getCurrentImageId(), this.setShownImage.bind(this));
      }
      else if (this.currentIndex <= 0 && restartWhenSeriesEnd) {
        this.currentIndex = this.imageCount - 1;
        this.onCurrentImageIdChanged.trigger(this.getCurrentImageId(), this.setShownImage.bind(this));
      }
      else {
        // Don't trigger event when nothing happens (the series is already at its end)
      }
    };

    WvSeries.prototype.goToImage = function (newIndex) {
      // Convert index to integer to be able to simply use expressions 
      // such as `imageCount/2` in AngularJS declarative code and 
      // elsewhere.
      newIndex = Math.floor(newIndex);

      // Limit index to available range of image
      if (newIndex < 0) {
        newIndex = -1;
      }
      else if (newIndex + 1 > this.imageCount) {
        return;
      }

      // Do nothing when the image does not change
      if (this.currentIndex == newIndex) {
        return;
      }

      this.currentIndex = newIndex;
      this.onCurrentImageIdChanged.trigger(this.getCurrentImageId(), this.setShownImage.bind(this));
    };

    var _cancelAnimationId = null;
    var _timeLog;
    WvSeries.prototype.playPreview = function () { // when playing in the viewport, we use the SeriesPlayer that can synchronize series
      var _this = this;

      // Do nothing when there is only one image
      if (this.imageCount < 2) {
        return;
      }

      if (this.isPlaying) {
        return;
      }

      var _lastTimeInMs = null;

      // Benchmark play loop
      if (console.time && console.timeEnd) {
        _timeLog = 'play (expect ? ms)';
        // console.time(_timeLog);
      }

      // Create recursive closure to display each images
      (function loop() {
        var desiredFrameRateInMs = 1000 / _this.frameRate; // Convert framerate FPS into MS
        // Wait for the monitor to attempt refresh
        _cancelAnimationId = requestAnimationFrame(function (currentTimeInMs) {
          // Request next frame before anything.
          if (_this.isPlaying) {
            loop();
          }

          // In Safari Mobile 10, currentTimeInMs is undefined. This
          // bug is undocumented and doesn't seem to be well known.
          // We specify the variable value manually to prevent the
          // play feature from not working.
          if (typeof currentTimeInMs === 'undefined') {
            currentTimeInMs = performance.now();
          }

          // Draw series at desired framerate (wait for the desired framerate ms time to be passed,
          // skip displaying till it has not passed)
          if (currentTimeInMs - _lastTimeInMs >= desiredFrameRateInMs) {
            $rootScope.$apply(function () {
              // Go to next image
              _this.goToNextImage(true);

              // Benchmark play loop
              if (console.time && console.timeEnd) {
                // console.timeEnd(_timeLog);
                _timeLog = 'play (expect ' + Math.round(desiredFrameRateInMs) + 'ms)';
                // console.time(_timeLog);
              }

              // Track current time to calculate Frame Rate
              _lastTimeInMs = currentTimeInMs;
            });
          }
        });
      })();

      this.isPlaying = true;
    };

    WvSeries.prototype.pausePreview = function () {
      if (_cancelAnimationId) {
        cancelAnimationFrame(_cancelAnimationId);
        _cancelAnimationId = null;

        // Stop benchmarking play loop
        if (console.time && console.timeEnd) {
          // console.timeEnd(_timeLog);
          _timeLog = 'play (expect ? ms)';
        }
      }

      this.isPlaying = false;
    };

    WvSeries.prototype._loadAnnotationGroup = function () {
      var _this = this;

      if (!this._annotationGroup) {
        // retrieve each kind of annotation for each image in the series
        var annotations = [];
        this.imageIds.forEach(function (imageId) {
          annotations.push(wvAnnotationManager.getByImageId(imageId));
        });

        // cache annotations
        this._annotationGroup = new WvAnnotationGroup(annotations);
      }

      return this._annotationGroup;
    };

    var crossProduct = function (a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    };

    var dotProduct = function (a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    };

    var getVectorsFromOrientation = function (orientationTag) {
      var split = orientationTag.split("\\");
      var x = split.splice(0, 3).map(function (s) { return parseFloat(s); });
      var y = split.splice(0, 3).map(function (s) { return parseFloat(s); });
      return { x: x, y: y };
    };

    WvSeries.prototype.isSameOrientationAs = function (otherSeries) {
      // compute the dot products of normals to check they have the same orientations
      var thisSeriesVectors = getVectorsFromOrientation(this.tags.ImageOrientationPatient);
      var otherSeriesVectors = getVectorsFromOrientation(otherSeries.tags.ImageOrientationPatient);

      var thisSeriesNormal = crossProduct(thisSeriesVectors.x, thisSeriesVectors.y);
      var otherSeriesNormal = crossProduct(otherSeriesVectors.x, otherSeriesVectors.y);
      var dotProductNormals = dotProduct(thisSeriesNormal, otherSeriesNormal);

      return dotProductNormals > 0.984;  // we do accept orientation that are "close" to each other (10° max -> cos(10°) = 0.984)
    };

    WvSeries.prototype.isSameFrameOfReference = function (otherSeries) {
      return (this.tags.FrameOfReferenceUID == otherSeries.tags.FrameOfReferenceUID);
    };

    WvSeries.prototype.hasSlices = function () {
      return this.tags.SliceLocation !== undefined && this.tags.SliceThickness !== undefined;
    };

    WvSeries.prototype.getImageCount = function () {
      return this.imageIds.length;
    };

    WvSeries.prototype.getIndexOfClosestImageFrom = function (otherSliceLocation) {
      var _this = this;
      var imageTagsPromises = this.imageIds.map(function (imageId) {
        return wvImageManager.get(imageId);
      });

      return Promise.all(imageTagsPromises).then(function (images) {
        var closestIndex = -1;
        var closestDistance = 99999;
        var sliceThickness = images[0].instanceInfos.TagsSubset.SliceThickness;
        // console.log("searching slice closest to ", otherSliceLocation);
        for (var i = 0; i < images.length; ++i) {
          var distance = Math.abs(images[i].instanceInfos.TagsSubset.SliceLocation - otherSliceLocation);

          // console.log(images[i].instanceInfos.TagsSubset.SliceLocation, otherSliceLocation);
          // console.log("distance = " + distance + ", sliceThickness = " + sliceThickness);
          if (distance < closestDistance && distance <= sliceThickness) {
            closestIndex = i;
            closestDistance = distance;
          }
        }

        return { 'closestIndex': closestIndex, 'series': _this, 'closestDistance': closestDistance };
      });

    };

    ////////////////

    return WvSeries;
  };

})();