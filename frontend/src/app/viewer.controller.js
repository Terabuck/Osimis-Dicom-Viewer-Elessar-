(function(osimis) {
    'use strict';

    var getBoolFromLocalStorage = function(key, defaultValue) {
        var value = window.localStorage.getItem(key);
        if (value === null) {
            return defaultValue;
        }
        return value === "true";
    }

    var getIntFromLocalStorage = function(key, defaultValue) {
        var value = window.localStorage.getItem(key);
        if (value === null) {
            return defaultValue;
        }
        return parseInt(value);
    }

    var getStringFromLocalStorage = function(key, defaultValue) {
        var value = window.localStorage.getItem(key);
        if (value === null) {
            return defaultValue;
        }
        return value;
    }

    // the ViewerController has been introduced mainly to avoid circular dependencies betwwen all "modules"
    // ViewerController is a central contact point that can dispatch the calls to other modules that do not have to "know" him

    function ViewerController($q, wvPaneManager, wvStudyManager, wvReferenceLines, wvSeriesManager, wvConfig) {
        this._isOverlayTextVisible = getBoolFromLocalStorage("isOverlayTextVisible", true);
        this._isOverlayIconsVisible = getBoolFromLocalStorage("isOverlayIconsVisible", true);
        this._layoutX = getIntFromLocalStorage("layoutX", 1);
        this._layoutY = getIntFromLocalStorage("layoutY", 1);

        this._selectedStudyIds = [];
        this.wvPaneManager = wvPaneManager;
        this.wvStudyManager = wvStudyManager;
        this.wvReferenceLines = wvReferenceLines;
        this.wvSeriesManager = wvSeriesManager;
        this.wvConfig = wvConfig;
        this.$q = $q;

        this.saveStateToLocalStorage();
    }

    ViewerController.prototype.saveStateToLocalStorage = function() {
        window.localStorage.setItem("isOverlayTextVisible", this._isOverlayTextVisible);
        window.localStorage.setItem("isOverlayIconsVisible", this._isOverlayIconsVisible);
        window.localStorage.setItem("layoutX", this._layoutX);
        window.localStorage.setItem("layoutY", this._layoutY);
    }

    ViewerController.prototype.getStudyIslandDisplayMode = function(defaultValue) {
        return getStringFromLocalStorage("studyIslandsDisplayMode", defaultValue);
    }

    ViewerController.prototype.saveStudyIslandDisplayMode = function(displayMode) {
        window.localStorage.setItem("studyIslandsDisplayMode", displayMode);
    }


    ViewerController.prototype.setSelectedStudyIds = function(selectedStudyIds) {
        this._selectedStudyIds = selectedStudyIds;
    }


    ViewerController.prototype.toggleOverlayText = function() {
        this._isOverlayTextVisible = !this._isOverlayTextVisible;
        this.saveStateToLocalStorage();
    }
    ViewerController.prototype.isOverlayTextVisible = function() {
    	return this._isOverlayTextVisible;
    }
    ViewerController.prototype.setOverlayTextVisible = function(enabled) {
        this._isOverlayTextVisible = enabled;
        this.saveStateToLocalStorage();
    }


    ViewerController.prototype.toggleOverlayIcons = function() {
        this._isOverlayIconsVisible = !this._isOverlayIconsVisible;
        this.saveStateToLocalStorage();
    }
    ViewerController.prototype.isOverlayIconsVisible = function() {
    	return this._isOverlayIconsVisible;
    }
    ViewerController.prototype.setOverlayIconsVisible = function(enabled) {
        this._isOverlayIconsVisible = enabled;
        this.saveStateToLocalStorage();
    }

    ViewerController.prototype.setLayout = function(x, y) {
        this._layoutX = x;
        this._layoutY = y;
        this.saveStateToLocalStorage();
        this.wvPaneManager.setLayout(x, y);
    }

    ViewerController.prototype.getLayout = function() {
        return {x: this._layoutX, y: this._layoutY};
    }

    ViewerController.prototype.setPane = function(x, y, paneOptions) {
      var that = this;
      this.wvPaneManager.setPane(x, y, paneOptions);
      if (paneOptions.seriesId !== undefined) {
        this.wvSeriesManager.get(paneOptions.seriesId).then(function(series) {
          that.wvReferenceLines.update(series);
        });
      }
    }

    ViewerController.prototype.executeCustomCommand = function() {
      var selectedPane = this.wvPaneManager.getSelectedPane();
      var that = this;
      selectedPane.getImage().then(function(image) {
//        console.log(image.id);
        var request = new osimis.HttpRequest();
        request.setHeaders(that.wvConfig.httpRequestHeaders);
        request.setCache(false);

        request.post(that.wvConfig.orthancApiURL + '/osimis-viewer/custom-command/' + image.id.split(":")[0], "")
          .then(function(response) {
            console.log("custom-command executed");
          })

      });

    }

    ViewerController.prototype.nextSeries = function() {
        var selectedPane = this.wvPaneManager.getSelectedPane();
        var this_ = this;
        selectedPane.getNextSeriesPaneConfigPromise().then(function(config) {
            config.csViewport = null;
            config.imageIndex = 0;
            config.isSelected = true;
            this_.setPane(selectedPane.x, selectedPane.y, config);
        });
    }

    ViewerController.prototype.previousSeries = function() {
        var selectedPane = this.wvPaneManager.getSelectedPane();
        var this_ = this;
        selectedPane.getPreviousSeriesPaneConfigPromise().then(function(config) {
            config.csViewport = null;
            config.imageIndex = 0;
            config.isSelected = true;
            this_.setPane(selectedPane.x, selectedPane.y, config);
        });
    }

    ViewerController.prototype.nextStudy = function() {
        var selectedPane = this.wvPaneManager.getSelectedPane();
        var this_ = this;

        selectedPane.getStudy().then(function(study){
            var selectedStudyIds = this_._selectedStudyIds;
            var currentIndex = selectedStudyIds.indexOf(study.id);
            var nextIndex = (currentIndex + 1) % selectedStudyIds.length; // select the next study or the first
            if (currentIndex != nextIndex) {
                return this_.wvStudyManager.get(selectedStudyIds[nextIndex]);
            } else {
                return this_.$q.reject();
            }
        }).then(function(nextStudy){
            var firstItemTuple = nextStudy.getNextItemId(),
                paneOptions = {csViewport: null, isSelected: true, studyColor: nextStudy.color};

            if(firstItemTuple[1] == "series"){
                paneOptions.seriesId = firstItemTuple[0];
            }else if(firstItemTuple[1] == "video"){
                paneOptions.videoId = firstItemTuple[0];
            }else {
                paneOptions.reportId = firstItemTuple[0];
            }

            this_.setPane(selectedPane.x, selectedPane.y, paneOptions)
        })
    };

    ViewerController.prototype.previousStudy = function() {
        var selectedPane = this.wvPaneManager.getSelectedPane();
        var this_ = this;

        selectedPane.getStudy().then(function(study){
            var selectedStudyIds = this_._selectedStudyIds;
            var currentIndex = selectedStudyIds.indexOf(study.id);
            var previousIndex = (currentIndex - 1 + selectedStudyIds.length) % selectedStudyIds.length; // select the previous study or the last
            if (currentIndex != previousIndex) {
                return this_.wvStudyManager.get(selectedStudyIds[previousIndex]);
            } else {
                return this_.$q.reject();
            }
        }).then(function(previousStudy){
            var firstItemTuple = previousStudy.getNextItemId(),
                paneOptions = {csViewport: null, isSelected: true, studyColor: previousStudy.color};

            if(firstItemTuple[1] == "series"){
                paneOptions.seriesId = firstItemTuple[0];
            }else if(firstItemTuple[1] == "video"){
                paneOptions.videoId = firstItemTuple[0];
            }else {
                paneOptions.reportId = firstItemTuple[0];
            }

            this_.setPane(selectedPane.x, selectedPane.y, paneOptions)
        })
    };

    angular
        .module('webviewer')
        .factory('wvViewerController', wvViewerController);

    /* @ngInject */
    function wvViewerController($q, wvPaneManager, wvStudyManager, wvReferenceLines, wvSeriesManager, wvConfig) {
        return new ViewerController($q, wvPaneManager, wvStudyManager, wvReferenceLines, wvSeriesManager, wvConfig);
    }
})(osimis || (this.osimis = {}));
