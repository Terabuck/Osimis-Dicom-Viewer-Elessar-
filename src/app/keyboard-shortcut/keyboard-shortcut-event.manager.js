(function(osimis){
    'use strict';

    angular
        .module('webviewer')
        .factory('wvKeyboardShortcutEventManager', wvKeyboardShortcutEventManager);

    /**
     * Service that handle keyboard shortcut event and convert them into different osimis Listener
     *
     * @Require: https://github.com/RobertWHurst/KeyboardJS
     */

    /* @ngInject */
    function wvKeyboardShortcutEventManager($rootScope, wvConfig, wvStudyManager, wvPaneManager, wvSynchronizer, wvReferenceLines, wvSeriesPlayer, wvViewerController){
        this.previousSynchroStatus = undefined;

        keyboardJS.setContext('viewerShortcut');

        var handlers = createHandlers(this);

        if (wvConfig.config.keyboardShortcutsEnabled) {
            console.log("assigning keyboard shortcuts");
            for (var keyboardCodeString in wvConfig.config.keyboardShortcuts) {
                var keyboardCodes = keyboardCodeString.split(",");

                var handlerName = wvConfig.config.keyboardShortcuts[keyboardCodeString];
                if (handlerName in handlers) {
                    bindKey(keyboardCodes, handlers[handlerName]);
                } else {
                    console.log("unable to define a keyboard shortcut for ", keyboardCodeString, " '", handlerName, "'; handler is not available");
                }
            }

            bindKey('shift', handlers.enterTemporaryToggleSynchro, handlers.exitTemporaryToggleSynchro, true);
            // bindKey('cmd + p', window.print);
            // bindKey('command + p', window.print);
        } else {
            console.log("keyboard shortcuts are disabled");
        }
        return handlers;

        ////////////

        function bindKey(keyboardCode, keyDownHandler, keyUpHandler, preventRepeat){

            var keyDownFunction = undefined;
            if (keyDownHandler) {
                keyDownFunction = function(e) {
                    console.log('keyboard shortcut listener for ', keyboardCode, ' (down) is being triggered');
                    e.preventDefault();
                    if (preventRepeat) {
                        e.preventRepeat();
                    }
                    $rootScope.$apply(function() {keyDownHandler();});
                }
            }
            var keyUpFunction = undefined;
            if (keyUpHandler) {
                keyUpFunction = function(e) {
                    console.log('keyboard shortcut listener for ', keyboardCode, ' (up) is being triggered');
                    e.preventDefault();
                    $rootScope.$apply(function() {keyUpHandler();});
                }
            }

            keyboardJS.bind(keyboardCode, keyDownFunction, keyUpFunction);
        }

        function applyConfigWindowingPreset(index) {
            wvPaneManager.getSelectedPane().applyConfigWindowingPreset(index);
            wvSynchronizer.getListOfSynchronizedPanes(wvPaneManager.getSelectedPane().series).forEach(function(pane) {pane.applyConfigWindowingPreset(index)});
        }
        function applyEmbeddedWindowingPreset(index) {
            wvPaneManager.getSelectedPane().applyEmbeddedWindowingPreset(index);
            wvSynchronizer.getListOfSynchronizedPanes(wvPaneManager.getSelectedPane().series).forEach(function(pane) {pane.applyEmbeddedWindowingPreset(index)});
        }

        function createHandlers(this_) {
            var handlers = {};

            handlers.enableKeyboardShortucts = function() {
                keyboardJS.setContext('viewerShortcut');
            };
            handlers.disableKeyboardShortucts = function() {
                keyboardJS.setContext(null);
            };

            handlers.toggleSynchro = function() {
                wvSynchronizer.toggle();
            };
            handlers.enableSynchro = function() {
                wvSynchronizer.enable(true);
            };
            handlers.disableSynchro = function() {
                wvSynchronizer.enable(false);
            };

            handlers.toggleReferenceLines = function() {
                wvReferenceLines.toggle();
            };
            handlers.enableReferenceLines = function() {
                wvReferenceLines.enable(true);
            };
            handlers.disableReferenceLines = function() {
                wvReferenceLines.enable(false);
            };

            handlers.enterTemporaryToggleSynchro = function() {
                if (this_.previousSynchroStatus === undefined) {
                    this_.previousSynchroStatus = wvSynchronizer.isEnabled();
                    wvSynchronizer.enable(!this_.previousSynchroStatus);
                }
            };
            handlers.exitTemporaryToggleSynchro = function() {
                wvSynchronizer.enable(this_.previousSynchroStatus);
                this_.previousSynchroStatus = undefined;
            };

            handlers.toggleOverlayText = function() {
                wvViewerController.toggleOverlayText();
            };
            handlers.toggleOverlayIcons = function() {
                wvViewerController.toggleOverlayIcons();
            };

            handlers.play = function() {
                var selectedPane = wvPaneManager.getSelectedPane();
                wvSeriesPlayer.play(selectedPane.series)
            };
            handlers.pause = function() {
                var selectedPane = wvPaneManager.getSelectedPane();
                wvSeriesPlayer.pause(selectedPane.series)
            };
            handlers.playPause = function() {
                var selectedPane = wvPaneManager.getSelectedPane();
                if (wvSeriesPlayer.isPlaying(selectedPane.series)) {
                    wvSeriesPlayer.pause(selectedPane.series);
                } else {
                    wvSeriesPlayer.play(selectedPane.series);
                }
            };

            handlers.null = function() {
            };

            handlers.nextStudy = function() {
                wvViewerController.nextStudy();
            };

            handlers.previousStudy = function() {
                wvViewerController.previousStudy();
            };

            handlers.nextSeries = function() {
                wvViewerController.nextSeries();
            };

            handlers.previousSeries = function() {
                wvViewerController.previousSeries();
            };

            handlers.previousImage = function() {
                var selectedPane = wvPaneManager.getSelectedPane();
                selectedPane.series.goToPreviousImage(true);
                wvSynchronizer.update(selectedPane.series);
                wvReferenceLines.update(selectedPane.series);
            };

            handlers.nextImage = function() {
                var selectedPane = wvPaneManager.getSelectedPane();
                selectedPane.series.goToNextImage(true);
                wvSynchronizer.update(selectedPane.series);
                wvReferenceLines.update(selectedPane.series);
            };

            handlers.rotateLeft = function() {
                wvPaneManager.getSelectedPane().rotateLeft();
            };

            handlers.rotateRight = function() {
                wvPaneManager.getSelectedPane().rotateRight();
            };

            handlers.flipVertical = function() {
                wvPaneManager.getSelectedPane().flipVertical();
            };

            handlers.flipHorizontal = function() {
                wvPaneManager.getSelectedPane().flipHorizontal();
            };

            handlers.invertColor = function() {
                wvPaneManager.getSelectedPane().invertColor();
            };

            handlers.setLayout1x1 = function() {
                wvViewerController.setLayout(1, 1);
            };
            handlers.setLayout1x2 = function() {
                wvViewerController.setLayout(1, 2);
            };
            handlers.setLayout2x1 = function() {
                wvViewerController.setLayout(2, 1);
            };
            handlers.setLayout2x2 = function() {
                wvViewerController.setLayout(2, 2);
            };

            handlers.selectNextPane = function() {
                wvPaneManager.selectNextPane();
            };
            handlers.selectPreviousPane = function() {
                wvPaneManager.selectPreviousPane();
            };

            handlers.loadSeriesInPane = function() {
                //opens a series in the selected pane if it's empty
                var selectedPane = wvPaneManager.getSelectedPane();
                if (!selectedPane.isEmpty()) {
                    return;
                }
                // find the previous pane with content -> we'll get the next series
                var previousPaneWithContent =  null;
                var currentPane = selectedPane;
                while (previousPaneWithContent == null) {
                    currentPane = wvPaneManager.getPreviousPane(currentPane);
                    if (!currentPane.isEmpty()) {
                        previousPaneWithContent = currentPane;
                    }
                }

                previousPaneWithContent.getStudy().then(function(study){
                    var currentItemId = previousPaneWithContent.seriesId || previousPaneWithContent.videoId || previousPaneWithContent.reportId,
                        nextItemTuple = study.getNextItemId(currentItemId),
                        paneOptions = {csViewport: null, isSelected: true, studyColor: study.color};

                    if(nextItemTuple[1] == "series"){
                        paneOptions.seriesId = nextItemTuple[0];
                    }else if(nextItemTuple[1] == "video"){
                        paneOptions.videoId = nextItemTuple[0];
                    }else {
                        paneOptions.reportId = nextItemTuple[0];
                    }
                    if(nextItemTuple[0] !== currentItemId){
                      wvViewerController.setPane(selectedPane.x, selectedPane.y, paneOptions)
                    }
                });
            };

            handlers.selectCombinedTool = function() {
                angular.element('#toolbox-combined-tool-button').click();
            };

            handlers.selectPanTool = function() {
                angular.element('#toolbox-pan-button').click();
            };

            handlers.selectZoomTool = function() {
                angular.element('#toolbox-zoom-button').click();
            };

            handlers.selectCrossHairTool = function() {
              angular.element('#toolbox-crossHair-button').click();
            };

            handlers.selectWindowingTool = function() {
                angular.element('#toolbox-windowing-button').click();
            };

            handlers.selectMagnifyingGlassTool = function() {
                angular.element('#toolbox-magnifying-glass-button').click();
            };

            handlers.selectLengthMeasureTool = function() {
                angular.element('#toolbox-length-measure-button').click();
            };

            handlers.selectPixelProbeTool = function() {
                angular.element('#toolbox-pixel-probe-button').click();
            };

            handlers.selectEllipticalRoiTool = function() {
                angular.element('#toolbox-elliptical-roi-button').click();
            };

            handlers.selectRectangleRoiTool = function() {
                angular.element('#toolbox-rectangle-roi-button').click();
            };

            handlers.selectArrowAnnotateTool = function() {
                angular.element('#toolbox-arrow-annotate-button').click();
            };

            handlers.selectKeyImageCaptureTool = function() {
                angular.element('#toolbox-key-image-capture-button').click();
            };

            handlers.applyEmbeddedWindowingPreset1 = function() {
                applyEmbeddedWindowingPreset(0);
            };
            handlers.applyEmbeddedWindowingPreset2 = function() {
                applyEmbeddedWindowingPreset(1);
            };
            handlers.applyEmbeddedWindowingPreset3 = function() {
                applyEmbeddedWindowingPreset(2);
            };
            handlers.applyEmbeddedWindowingPreset4 = function() {
                applyEmbeddedWindowingPreset(3);
            };
            handlers.applyEmbeddedWindowingPreset5 = function() {
                applyEmbeddedWindowingPreset(4);
            };

            handlers.applyConfigWindowingPreset1 = function() {
                applyConfigWindowingPreset(0);
            };
            handlers.applyConfigWindowingPreset2 = function() {
                applyConfigWindowingPreset(1);
            };
            handlers.applyConfigWindowingPreset3 = function() {
                applyConfigWindowingPreset(2);
            };
            handlers.applyConfigWindowingPreset4 = function() {
                applyConfigWindowingPreset(3);
            };
            handlers.applyConfigWindowingPreset5 = function() {
                applyConfigWindowingPreset(4);
            };
            handlers.print = function(){
                window.print();
            }

            return handlers;
        }
    }

})(this.osimis || (this.osimis = {}));

