/**
 * @ngdoc directive
 * @name webviewer.directive:wvWebviewer
 *
 * @param {Array<string>} wvPickableStudyIds
 * Define a list of study that can be accessed by the user. Thus, it's possible
 * for host application to restrict access to a specific set of study depending
 * on the current user. This also allow entry points to set the pickable
 * studies as the current patient ones. Be aware this does not compensate
 * server-side security, but provide an easy mechanism to override the studies
 * shown in the study picker without overriding the <orthanc>/studies route.
 *
 * @param {Array<string>} [wvSelectedStudyIds=EmptyArray]
 * Configure the studies shown in the serieslist. `wvSerieslistEnabled` must be
 * true.
 *
 * @param {boolean} [wvToolbarEnabled=true]
 * Display the toolbar. Note all tools are disabled when the toolbar is
 * disabled, including the preselected ones (zooming).
 *
 * @param {string} [wvToolbarPosition='top']
 * The toolbar position on the screen.
 *
 * Can either be:
 *
 * * `top`
 * * `right`
 *
 * @param {boolean} [wvSerieslistEnabled=true]
 * Display the list of series based on the `wvStudyId`.
 *
 * @param {boolean} [wvStudyinformationEnabled=true]
 * Display the study information (breadcrumb) based on the `wvStudyId`.
 *
 * @param {boolean} [wvStudyDownloadEnabled=false]
 * Display study download buttons in the study islands.
 *
 * @param {boolean} [wvLefthandlesEnabled=true]
 * Display buttons to toggle the left side of the interface. The right handles
 * are configurable via the transcluded directive.
 *
 * @param {boolean} [wvNoticeEnabled=false]
 * Display a notice in the bottom side of the application.
 *
 * @param {string} [wvNoticeText=undefined]
 * The displayed notice content, for instance instructions over mobile
 * ergonomy, or related series / studies.
 *
 * @param {boolean} [wvSeriesItemSelectionEnabled=true]
 * Let the end-user select series in the serieslist using a single click. This
 * selection has no impact on the standalone viewer. However, host applications
 * can retrieve the selection to do customized actions using the
 * `wvSelectedSeriesItem` parameter. When turned back to false, the selection
 * is kept cached.
 *
 * @param {Array<object>} [wvSelectedSeriesItems=EmptyArray] (readonly)
 * A list of selected series items. This list can be retrieved to customize the
 * viewer by host applications. See the `wvSeriesItemSelectionEnabled`
 * parameter.
 *
 * Inner objects can contains the following attributes:
 *
 * * {string} `seriesId`
 *   The orthanc series id. This parameter is not provided for PDF report &
 *   video. Note this is the original orthanc id, not the webviewer's series
 *   id. This parameter is always provided.
 *
 * * {number} `instanceIndex`
 *   The instance index. A multiframe instance appears as a series in the
 *   Osimis web viewer. Thus, the series id might not be enough in these cases.
 *   This parameter is not provided for video & pdf instances.
 *
 * * {string} `studyId`
 *   The orthanc study id. This parameter is always provided.
 *
 * * {string} `instanceId`
 *   The orthanc instance id. This parameter is only provided for selected PDF
 *   report or video. Selected multiframe instance do not provide this
 *   parameter, you have to rely on `seriesId` instead.
 *
 * @param {string} [wvSeriesId=undefined]
 * Configure the series shown in the main viewport. Viewport's data are reset
 * on change.
 *
 * @param {object} [wvTools=...]
 * Configure the displayed tools with their default value. See source code for
 * available configuration options.
 *
 * @param {boolean} [wvReadonly=false]
 * Prevent the user from controling the interface. This is primary useful to
 * prevent liveshare session's attendees interfer with the chair (though the
 * parameter is configured from within the `wvLiveshare` directive).
 *
 * Especially, the following actions are disabled:
 *
 * * Drag&dropping series from the `wvSerieslist` into viewports
 * * Using the timeline controls
 * * Using the toolbar & tools
 * * Scrolling through the series via the mousewheel
 *
 * @param {Array<Object {{string} name, {number} windowWidth, {number} windowCenter}>} wvWindowingPresets
 * Sets the list of windowing presets. This parameter will most likely be set
 * via the backend json configuration file or resolve into a default list (set
 * from the backend).
 *
 * @param {boolean} [wvVideoDisplayEnabled=true]
 * Display videos in the serieslist.
 *
 * @param {boolean} [wvAnnotationstorageEnabled=true]
 * Retrieve annotations from storage. Store annotations to storage
 * automatically. This should be set to false when `wvReadonly` is true.
 *
 * @param {boolean} [wvKeyImageCaptureEnabled=false]
 * When activated, this option displays a button on each viewport. When the button is
 * clicked, a new DICOM series is created with the image of the viewport, including the
 * annotations. This image is considered as a DICOM Key Image Note (see
 * `http://wiki.ihe.net/index.php/Key_Image_Note`).
 *
 * @scope
 * @restrict E
 *
 * @description
 * The `wvWebviewer` directive display a whole web viewer at full scale (100%
 * width, 100% height).
 **/
 (function () {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvWebviewer', wvWebviewer);

    /* @ngInject */
    function wvWebviewer($rootScope, $timeout, $translate, wvStudyManager, wvAnnotationManager, wvImageManager, wvPaneManager, wvWindowingViewportTool, wvSynchronizer, wvReferenceLines, wvViewerController, wvConfig) {
        var directive = {
            bindToController: true,
            controller: Controller,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                readonly: '=?wvReadonly',
                pickableStudyIdLabels: '=?wvPickableStudyIdLabels',  // {studyOrthancUuid: "text to display"}
                pickableStudyIds: '=wvPickableStudyIds',
                selectedStudyIds: '=?wvSelectedStudyIds',
                seriesId: '=?wvSeriesId',
                tools: '=?wvTools',
                toolbarEnabled: '=?wvToolbarEnabled',
                toolbarPosition: '=?wvToolbarPosition',
                toolbarLayoutMode: '=?wvToolbarLayoutMode',
                toolbarDefaultTool: '=?wvToolbarDefaultTool',
                serieslistEnabled: '=?wvSerieslistEnabled',
                studyinformationEnabled: '=?wvStudyinformationEnabled',
                leftHandlesEnabled: '=?wvLefthandlesEnabled',
                noticeEnabled: '=?wvNoticeEnabled',
                noticeText: '=?wvNoticeText',
                windowingPresets: '=wvWindowingPresets',
                annotationStorageEnabled: '=?wvAnnotationstorageEnabled',
                studyDownloadEnabled: '=?wvStudyDownloadEnabled',
                videoDisplayEnabled: '=?wvVideoDisplayEnabled',
                keyImageCaptureEnabled: '=?wvKeyImageCaptureEnabled',
                showInfoPopupButtonEnabled: '=?wvShowInfoPopupButtonEnabled',
                downloadAsJpegEnabled: '=?wvDownloadAsJpegEnabled',
                combinedToolEnabled: '=?wvCombinedToolEnabled',
                showNoReportIconInSeriesList: '=?wvShowNoReportIconInSeriesList',
                reduceTimelineHeightOnSingleFrameSeries: '=?wvReduceTimelineHeightOnSingleFrameSeries',
                buttonsSize: '=?wvButtonsSize',  // small | large
                studyIslandsDisplayMode: '=?wvStudyIslandsDisplayMode',

                displayDisclaimer: '=?wvDisplayDisclaimer',
                toolboxButtonsOrdering: '=?wvToolboxButtonsOrdering',

                // Selection-related
                seriesItemSelectionEnabled: '=?wvSeriesItemSelectionEnabled',
                selectedSeriesItems: '=?wvSelectedSeriesItems', // readonly

                isAsideClosed: '=?wvIsAsideClosed'
            },
            transclude: {
                wvLayoutTopLeft: '?wvLayoutTopLeft',
                wvLayoutTopRight: '?wvLayoutTopRight',
                wvLayoutRight: '?wvLayoutRight',
                wvLayoutLeftBottom: '?wvLayoutLeftBottom',
                wvLayoutLeftTop: '?wvLayoutLeftTop'
            },
            templateUrl: 'app/webviewer.directive.html'
        };
        return directive;

        function indexImageLayout({ x, y }) {
            
            const coordinates = {
                '0,0': 'R-CC',
                '0,1': 'L-CC',
                '1,0': 'R-MLO',
                '1,1': 'L-MLO',
            };
            const key = `${y},${x}`; // Corregido: Añadidas las comillas
            const pane = coordinates[key];
          
            if (pane !== undefined) {
                const layoutIndexMap = {
                    'R-CC': 0,
                    'L-CC': 1,
                    'R-MLO': 2,
                    'L-MLO': 3,
                };
        
                return layoutIndexMap[pane] !== undefined ? layoutIndexMap[pane] : 0;
            }
            return 0;
        };
        


        function link(scope, element, attrs, ctrls, transcludeFn) {
            var vm = scope.vm;

            { // check browser compatibility
                var browserName = wvConfig.browser.browser.name;
                var browserMajorVersion = wvConfig.browser.browser.major;
                var osName = wvConfig.browser.os.name;

                vm.openIncompatibleBrowserModal = false;
                console.log("Checking browser compatibility:", wvConfig.browser);
                var minimalChromeVersion =  45;
                var minimalSafariVersion = 9;
                var minimalFirefoxVersion = 48;
                var minimalTizenVersion = 3;
                var minimalEdgeVersion = 14;
                var minimalIEVersion = 11;

                if (osName === "Mac OS") {
                    minimalChromeVersion = 48;
                    minimalFirefoxVersion = 28;
                }
                if (osName === "iOS" && wvConfig.browser.device.model === "iPhone") { // not supported at all on iPhone right now (too many bugs)
                    minimalChromeVersion = 45;
                    minimalFirefoxVersion = 48;
                    minimalSafariVersion = 9;
                }

                if ((browserName === "Chrome" && browserMajorVersion >= minimalChromeVersion) 
                    || (browserName === "Mobile Safari" && browserMajorVersion >= minimalSafariVersion) 
                    || (browserName === "Safari" && browserMajorVersion >= minimalSafariVersion) 
                    || (browserName === "Firefox" && browserMajorVersion >= minimalFirefoxVersion)
                    || (browserName === "TizenBrowser" && browserMajorVersion >= minimalTizenVersion)  
                    || (browserName === "Edge" && browserMajorVersion >= minimalEdgeVersion) 
                    || (browserName === "IE" && browserMajorVersion >= minimalIEVersion)){
                    console.log(browserName + " Supported");
                }
                else{
                    vm.openIncompatibleBrowserModal = true;
                    vm.incompatibleBrowserErrorMessage = browserName + " version " + browserMajorVersion + " is not supported.  You might expect inconsistent behaviours and shall not use the viewer to produce a diagnostic.";
                    console.log(vm.incompatibleBrowserErrorMessage);
                }

                vm.onCloseWarning = function(){
                    vm.openIncompatibleBrowserModal = false;
                }
            }

            vm.paneManager = wvPaneManager;
            vm.synchronizer = wvSynchronizer;
            vm.referenceLines = wvReferenceLines;
            vm.wvWindowingViewportTool = wvWindowingViewportTool;

            // Configure attributes default values
            vm.toolbarEnabled = typeof vm.toolbarEnabled !== 'undefined' ? vm.toolbarEnabled : true;
            vm.toolbarPosition = typeof vm.toolbarPosition !== 'undefined' ? vm.toolbarPosition : 'top';
            vm.buttonsSize = typeof vm.buttonsSize !== 'undefined' ? vm.buttonsSize : 'small';
            vm.customCommandIconLabel = typeof vm.customCommandIconLabel !== 'undefined' ? vm.customCommandIconLabel : 'custom command';
            vm.customCommandIconClass = typeof vm.customCommandIconClass !== 'undefined' ? vm.customCommandIconClass : 'fa fa-exclamation';
            vm.serieslistEnabled = typeof vm.serieslistEnabled !== 'undefined' ? vm.serieslistEnabled : true;
            vm.studyinformationEnabled = typeof vm.studyinformationEnabled !== 'undefined' ? vm.studyinformationEnabled : true;
            vm.leftHandlesEnabled = typeof vm.leftHandlesEnabled !== 'undefined' ? vm.leftHandlesEnabled : true;
            vm.noticeEnabled = typeof vm.noticeEnabled !== 'undefined' ? vm.noticeEnabled : false;
            vm.noticeText = typeof vm.noticeText !== 'undefined' ? vm.noticeText : undefined;
            vm.infoPopupIsStartup = true;
            vm.infoPopupEnabled = true;
            vm.readonly = typeof vm.readonly !== 'undefined' ? vm.readonly : false;
            vm.wvViewerController = wvViewerController;
            vm.tools = typeof vm.tools !== 'undefined' ? vm.tools : {
                windowing: false,
                zoom: false,
                pan: false,
                invert: false,
                magnify: {
                    magnificationLevel: 5,
                    magnifyingGlassSize: 300
                },
                lengthMeasure: false,
                angleMeasure: false,
                simpleAngleMeasure: false,
                pixelProbe: false,
                ellipticalRoi: false,
                rectangleRoi: false,
                layout: {
                    x: vm.wvViewerController.getLayout().x,
                    y: vm.wvViewerController.getLayout().y
                },
                play: false,
                overlay: true,
                vflip: false,
                hflip: false,
                rotateLeft: false,
                rotateRight: false,
                arrowAnnotate: false,
                nextSeries: false,
                previousSeries: false
            };

            if (vm.keyImageCaptureEnabled) { // activate
                vm.tools.keyImageCapture = false;
            }
            if (vm.showInfoPopupButtonEnabled) { // activate
                vm.tools.showInfoPopup = false;
            }
            if (vm.downloadAsJpegEnabled) { // activate
                vm.tools.downloadAsJpeg = false;
            }
            if (vm.combinedToolEnabled) { // activate}
                vm.tools.combinedTool = false;
            }
            if (__webViewerConfig.printEnabled) { // activate}
                if (wvConfig.browser.browser.name == "IE") {
                    console.log("Internet Explorer does not support printing -> this feature will be disabled");
                } else {
                    vm.tools.print = false;
                }
            }
            if (__webViewerConfig.toggleOverlayTextButtonEnabled) { // activate}
                vm.tools.toggleOverlayText = false;
            }
            if (__webViewerConfig.toggleOverlayIconsButtonEnabled) { // activate}
                vm.tools.toggleOverlayIcons = false;
            }
            if (__webViewerConfig.synchronizedBrowsingEnabled) { // activate}
                vm.tools.toggleSynchro = false;
            } else {
                vm.synchronizer.enable(false);  // disable it when the button is not present
            }
            if (__webViewerConfig.referenceLinesEnabled) { // activate}
                vm.tools.toggleReferenceLines = false;
            } else {
                vm.referenceLines.enable(false);  // disable it when the button is not present
            }
            if (__webViewerConfig.crossHairEnabled) { // activate}
                vm.tools.crossHair = false;
            }

            if (__webViewerConfig.customCommandEnabled) { // activate
              vm.tools.customCommand = false;
              vm.customCommandIconLabel = __webViewerConfig.customCommandIconLabel;
              vm.customCommandIconClass = __webViewerConfig.customCommandIconClass;
            }

            console.log('default tool: ', vm.toolbarDefaultTool)
            if (vm.toolbarDefaultTool) {
                vm.tools[vm.toolbarDefaultTool] = true;
                vm.activeTool = vm.toolbarDefaultTool;
            }

            if (vm.toolboxButtonsOrdering === undefined) {
                vm.toolboxButtonsOrdering = [

                    {type: "button", tool: "combinedTool"},
                    {type: "button", tool: "zoom"},
                    {type: "button", tool: "pan"},
                    {type: "button", tool: "invert"},
                    {type: "button", tool: "crossHair"},

                    {type: "button", tool: "toggleOverlayText"},
                    {type: "button", tool: "toggleOverlayIcons"},
                    {type: "button", tool: "arrowAnnotate"},

                    {type: "button", tool: "keyImageCapture"},

                    {type: "button", tool: "toggleSynchro"},
                    {type: "button", tool: "toggleReferenceLines"},


                    {type: "button", tool: "lengthMeasure"},
                    {type: "button", tool: "simpleAngleMeasure"},
                    {type: "button", tool: "angleMeasure"},

                    {type: "button", tool: "pixelProbe"},
                    {type: "button", tool: "ellipticalRoi"},
                    {type: "button", tool: "rectangleRoi"},
                    {
                        type: "group",
                        iconClasses: "fa fa-pen-square",
                        title: "manipulation",
                        buttons: [
                            {type: "button", tool: "rotateLeft"},
                            {type: "button", tool: "rotateRight"},
                            {type: "button", tool: "hflip"},
                            {type: "button", tool: "vflip"},
                        ]
                    },
                    {type: "button", tool: "magnify"},
                    {type: "button", tool: "windowing"},
                    {type: "button", tool: "layout"},

                   
                    {type: "button", tool: "print"},
                    {type: "button", tool: "downloadAsJpeg"},

                    {type: "button", tool: "customCommand"},


                    // Optional buttons to explicitely activate
                    // {type: "button", tool: "previousSeries"},
                    // {type: "button", tool: "nextSeries"},

                
                ]
            }
            vm.viewports = {};
            vm.pickableStudyIds = typeof vm.pickableStudyIds !== 'undefined' ? vm.pickableStudyIds : [];
            vm.selectedStudyIds = typeof vm.selectedStudyIds !== 'undefined' ? vm.selectedStudyIds : [];
            vm.studyDownloadEnabled = typeof vm.studyDownloadEnabled !== 'undefined' ? vm.studyDownloadEnabled : false;
            vm.videoDisplayEnabled = typeof vm.videoDisplayEnabled !== 'undefined' ? vm.videoDisplayEnabled : true;
            vm.keyImageCaptureEnabled = typeof vm.keyImageCaptureEnabled !== 'undefined' ? vm.keyImageCaptureEnabled : false;
            vm.downloadAsJpegEnabled = typeof vm.downloadAsJpegEnabled !== 'undefined' ? vm.downloadAsJpegEnabled : false;
            vm.combinedToolEnabled = typeof vm.combinedToolEnabled !== 'undefined' ? vm.combinedToolEnabled : false;
            vm.showInfoPopupButtonEnabled = typeof vm.showInfoPopupButtonEnabled !== 'undefined' ? vm.showInfoPopupButtonEnabled : false;
            vm.studyIslandsDisplayMode = vm.wvViewerController.getStudyIslandDisplayMode(__webViewerConfig.defaultStudyIslandsDisplayMode || "grid");

            if (!__webViewerConfig.toggleOverlayIconsButtonEnabled) {
                vm.wvViewerController.setOverlayIconsVisible(__webViewerConfig.displayOverlayIcons);
            }
            if (!__webViewerConfig.toggleOverlayTextButtonEnabled) {
                vm.wvViewerController.setOverlayTextVisible(__webViewerConfig.displayOverlayText);
            }
            vm.wvViewerController.setSelectedStudyIds(vm.selectedStudyIds);

            // Selection-related
            vm.seriesItemSelectionEnabled = typeof vm.seriesItemSelectionEnabled !== 'undefined' ? vm.seriesItemSelectionEnabled : false;
            // 1. Values used by our internal directive.
            vm.selectedSeriesIds = vm.selectedSeriesIds || {};
            vm.selectedReportIds = vm.selectedReportIds || {};
            vm.selectedVideoIds = vm.selectedVideoIds || {};
            // 2. Values used by host applications.
            vm.selectedSeriesItems = vm.selectedSeriesItems || [];
            // Update selected***Ids based on selectedSeriesItems
            scope.$watch('vm.selectedSeriesItems', function(newValues, oldValues) {
                // Cleanup selected*Ids content
                vm.selectedSeriesIds = vm.selectedSeriesIds || {};
                _.forEach(vm.selectedSeriesIds, function(items, studyId) {
                    vm.selectedSeriesIds[studyId] = [];
                });
                vm.selectedVideoIds = vm.selectedVideoIds || {};
                _.forEach(vm.selectedVideoIds, function(items, studyId) {
                    vm.selectedVideoIds[studyId] = [];
                });
                vm.selectedReportIds = vm.selectedReportIds || {};
                _.forEach(vm.selectedReportIds, function(items, studyId) {
                    vm.selectedReportIds[studyId] = [];
                });

                // Push new values
                newValues && newValues
                    .forEach(function(newValue) {
                        var studyId = newValue.studyId;
                        switch (newValue.type) {
                        case 'series':
                            vm.selectedSeriesIds[studyId] = vm.selectedSeriesIds[studyId] || [];
                            vm.selectedSeriesIds[studyId].push(newValue.seriesId + ':' + newValue.instanceIndex);
                            break;
                        case 'report/pdf':
                            vm.selectedReportIds[studyId] = vm.selectedReportIds[studyId] || [];
                            vm.selectedReportIds[studyId].push(newValue.instanceId);
                            break;
                        case 'video/mpeg4':
                            vm.selectedVideoIds[studyId] = vm.selectedVideoIds[studyId] || [];
                            vm.selectedVideoIds[studyId].push(newValue.instanceId);
                            break;
                        }
                    });
            }, true);

            // Update selectedSeriesItems based on selected***Ids
            scope.$watch(function() {
                return {
                    series: vm.selectedSeriesIds,
                    reports: vm.selectedReportIds,
                    videos: vm.selectedVideoIds
                }
            }, function(newValues, oldValues) {
                var series = _
                    .flatMap(newValues.series, function(seriesIds, studyId) {
                        return seriesIds
                            .map(function (seriesId) {
                                // Split webviewer series id in orthanc series
                                // id + frame index.
                                var arr = seriesId.split(':');
                                var orthancSeriesId = arr[0];
                                var instanceIndex = arr[1];

                                // Return value.
                                return {
                                    seriesId: orthancSeriesId,
                                    studyId: studyId,
                                    instanceIndex: instanceIndex,
                                    type: 'series'
                                }
                            });
                    });

                var reports = _
                    .flatMap(newValues.reports, function(reportIds, studyId) {
                        return reportIds
                            .map(function (instanceId) {
                                return {
                                    instanceId: instanceId,
                                    studyId: studyId,
                                    type: 'report/pdf'
                                }
                            });
                    });

                var videos = _
                    .flatMap(newValues.videos, function(videoIds, studyId) {
                        return videoIds
                            .map(function (instanceId) {
                                return {
                                    instanceId: instanceId,
                                    studyId: studyId,
                                    type: 'video/mpeg4'
                                }
                            });
                    });

                vm.selectedSeriesItems = []
                    .concat(series)
                    .concat(reports)
                    .concat(videos);
            }, true);

            // Activate mobile interaction tools on mobile (not tablet)
            var uaParser = new UAParser();
            vm.mobileInteraction = uaParser.getDevice().type === 'mobile';
            if(vm.mobileInteraction){
                vm.tools.combinedTool = true;
                vm.activeTool = 'combinedTool';            }

            // Adapt breadcrumb displayed info based on the selected pane.
            wvPaneManager
                .getSelectedPane()
                .getStudy()
                .then(function(study) {
                    vm.selectedPaneStudyId = study && study.id;
                });
            wvPaneManager.onSelectedPaneChanged(function(pane) {
                pane
                    .getStudy()
                    .then(function(study) {
                        vm.selectedPaneStudyId = study && study.id;
                    });
            });

            // Apply viewport changes when toolbox action are clicked on.
            vm.onActionClicked = function(action) {
                // Retrieve selected pane (or leave the function if none).
                var selectedPane = wvPaneManager.getSelectedPane();

                if (this.readonly) {
                    return;
                }
                if (selectedPane.csViewport) {
                    switch (action) {                        case 'invert':
                    selectedPane.invertColor();
                    break;
                case 'vflip':
                    selectedPane.flipVertical();
                    break;
                case 'hflip':
                    selectedPane.flipHorizontal();
                    break;
                case 'rotateLeft':
                    selectedPane.rotateLeft();
                    break;
                case 'rotateRight':
                    selectedPane.rotateRight();
                    break;
                case 'toggleSynchro':
                    vm.synchronizer.enable(!vm.synchronizer.isEnabled());
                    break;
                case 'toggleReferenceLines':
                    vm.referenceLines.enable(!vm.referenceLines.isEnabled());
                    break;
                case 'toggleOverlayText':
                    vm.wvViewerController.toggleOverlayText();
                    break;
                case 'toggleOverlayIcons':
                    vm.wvViewerController.toggleOverlayIcons();
                    break;
                case 'previousSeries':
                    vm.wvViewerController.previousSeries();
                    break;
                case 'nextSeries':
                    vm.wvViewerController.nextSeries();
                    break;
                case 'print':
                    window.print();
                    break;
                case 'downloadAsJpeg':
                    selectedPane.downloadAsJpeg(wvImageManager);
                    break;
                case 'customCommand':
                    vm.wvViewerController.executeCustomCommand();
                    break;
                case 'showInfoPopup':
                    vm.infoPopupIsStartup = false;
                    vm.infoPopupEnabled = true;
                    break;
                default:
                    throw new Error('Unknown toolbar action.');
                }
            } else {
                switch (action) {
                    case 'showInfoPopup':
                        vm.infoPopupIsStartup = false;
                        vm.infoPopupEnabled = true;
                        break;
                    default:
                        throw new Error('Unknown toolbar action.');
                    }

            }

            };
            // Apply viewport change when a windowing preset has been
            // selected (from the toolbar).
            vm.onWindowingPresetSelected = function(windowWidth, windowCenter) {

                if (this.readonly) {
                    return;
                }

                // Retrieve selected pane (or leave the function if none).
                var selectedPane = wvPaneManager.getSelectedPane();
                vm.wvWindowingViewportTool.applyWindowingToPane(selectedPane, windowWidth, windowCenter, false);
            };

            // Store each panes' states.
            vm.panes = wvPaneManager.panes;

            // Keep pane layout model in sync.
            scope.$watch('vm.tools.layout', function(layout) {
                // Update panes' layout.
                vm.wvViewerController.setLayout(layout.x, layout.y);
                fillAllPanesWithFirstSeries(vm, wvStudyManager, wvPaneManager, wvViewerController)
            }, true);
            vm.onItemDroppedToPane = function(x, y, config) {
                // Set dropped pane as selected
                config.isSelected = true;

                // Change pane's configuration.
                wvViewerController.setPane(x, y, config);
            };

            // Enable/Disable annotation storage/retrieval from backend
            scope.$watch('vm.annotationStorageEnabled', function(isEnabled, wasEnabled) {
                if (isEnabled) {
                    wvAnnotationManager.enableAnnotationStorage();
                }
                else {
                    wvAnnotationManager.disableAnnotationStorage();
                }
            });

            vm.studiesColors = {
                green: [],
                red: [],
                blue: [],
                yellow: [],
                violet: []
            };
            scope.$watch('vm.selectedStudyIds', function(newValues, oldValues) {
                // Log study ids
                console.log('selected studies ids: ', newValues);
                wvViewerController.setSelectedStudyIds(newValues);

                // Consider oldValues to be empty if this watch function is
                // called at initialization.
                if (_.isEqual(newValues, oldValues)) {
                    oldValues = [];
                }

                // If selected study is not in selectable ones, adapt
                // selectables studies. This may sometime happens due to sync
                // delay.
                if (_.intersection(newValues, vm.pickableStudyIds).length !== newValues.length) {
                    vm.pickableStudyIds = newValues;
                }

                // Cancel previous preloading, reset studies colors & remove
                // study items' selection.
                oldValues
                    .filter(function(newStudyId) {
                        // Retrieve studyIds that are no longer shown.
                        return newValues.indexOf(newStudyId) === -1;
                    })
                    .forEach(function(oldStudyId) {
                        // Cancel preloading.
                        wvStudyManager.abortStudyLoading(oldStudyId);

                        // Set none color. Nice color for instance if a
                        // series is still displayed in a viewport but it's
                        // related study is no longer shown in the serieslist.
                        wvStudyManager
                            .get(oldStudyId)
                            .then(function(study) {
                                // Decr color usage.
                                vm.studiesColors[study.color].splice(vm.studiesColors[study.color].indexOf(study.id), 1);

                                // Unbind color from the study.
                                study.setColor('gray');
                            });

                        // Reset study items' selection in the serieslist.
                        if (vm.selectedSeriesIds.hasOwnProperty(oldStudyId)) {
                            delete vm.selectedSeriesIds[oldStudyId];
                        }
                        if (vm.selectedReportIds.hasOwnProperty(oldStudyId)) {
                            delete vm.selectedReportIds[oldStudyId];
                        }
                        if (vm.selectedVideoIds.hasOwnProperty(oldStudyId)) {
                            delete vm.selectedVideoIds[oldStudyId];
                        }
                        vm.selectedSeriesItems = vm.selectedSeriesItems
                            .filter(function(seriesItem) {
                                return seriesItem.studyId !== oldStudyId;
                            });
                    });

                // Preload studies, set studies color & fill first pane if
                // empty.
                newValues
                    .filter(function(newStudyId) {
                        // Retrieve studyIds that are new.
                        return oldValues.indexOf(newStudyId) === -1;
                    })
                    .forEach(function(newStudyId) {
                        // Preload them.
                        wvStudyManager.loadStudy(newStudyId);
                        wvAnnotationManager.loadStudyAnnotations(newStudyId);

                        // Set study color based on its position within the
                        // selected study ids. Used to attribute a color in
                        // the viewports so the end user can see directly which
                        // study is being displayed.
                        wvStudyManager
                            .get(newStudyId)
                            .then(function (study) {
                                // Check the study doesn't already have a color
                                // defined (through liveshare or external
                                // world).
                                if (!study.hasColor()) {
                                    // Get a color that has not been used yet.
                                    var availableColors = Object.keys(vm.studiesColors);
                                    var minColorUsageCount = undefined;
                                    var minColorUsageName;
                                    for (var i=0; i<availableColors.length; ++i) {
                                        var colorName = availableColors[i];
                                        var colorUsageCount = vm.studiesColors[colorName].length;
                                        if (typeof minColorUsageCount === 'undefined' || colorUsageCount < minColorUsageCount) {
                                            minColorUsageCount = colorUsageCount;
                                            minColorUsageName = colorName;
                                        }
                                    }

                                    // Bind color to the study.
                                    study.setColor(minColorUsageName);

                                    // Incr color usage index.
                                    vm.studiesColors[minColorUsageName].push(study.id);
                                }
                            });

                    });


                // if first pane is empty, set the first series in the first study.
                if(newValues && newValues[0]){
                    wvStudyManager.get(newValues[0]).then(function(firstStudy){
                        var firstPane = wvPaneManager.getPane(0, 0);
                        if(firstStudy && firstPane.isEmpty()){
                          wvViewerController.setPane(0, 0, {seriesId: firstStudy.series[0], isSelected: true, studyColor: firstStudy.color})
                        };
                    });
                }
            }, true);

            // Propagate series preloading events
            // @todo Add on-series-dropped callback and move out the rest of the events from wv-droppable-series.
            // @todo Only watch seriesIds & remove deep watch (opti).
            scope.$watch('vm.panes', function(newViewports, oldViewports) {
                for (var i=0; i<newViewports.length || i<oldViewports.length; ++i) {
                     fillAllPanesWithFirstSeries(vm, wvStudyManager, wvPaneManager, wvViewerController)
                    // Ignore changes unrelated to seriesId
                    if (oldViewports[i] && newViewports[i] && oldViewports[i].seriesId === newViewports[i].seriesId
                    || !oldViewports[i] && !newViewports[i]
                    ) {
                        continue;
                    }

                    // Set viewport's series
                    if (!oldViewports[i] && newViewports[i]) {
                        if (newViewports[i].seriesId) {
                            $rootScope.$emit('UserSelectedSeriesId', newViewports[i].seriesId);
                        }
                    }
                    // Remove viewport's series
                    else if (oldViewports[i] && !newViewports[i]) {
                        if (oldViewports[i].seriesId) {
                            $rootScope.$emit('UserUnSelectedSeriesId', oldViewports[i].seriesId);
                        }
                    }
                    // Replace viewport's series
                    else if (oldViewports[i] && newViewports[i] && oldViewports[i].seriesId !== newViewports[i].seriesId) {
                        if (oldViewports[i].seriesId) {
                            $rootScope.$emit('UserUnSelectedSeriesId', oldViewports[i].seriesId);
                        }
                        if (newViewports[i].seriesId) {
                            $rootScope.$emit('UserSelectedSeriesId', newViewports[i].seriesId);
                        }
                    }
                }
            }, true);

            // Adapt the first viewport to new seriesId
            scope.$watch('vm.seriesId', function(newSeriesId, oldSeriesId) {
                if (vm.panes[0]) {
                    // Change the series id
                    vm.panes[0].seriesId = newSeriesId;

                    // Reset image index
                    vm.panes[0].imageIndex = 0;

                    // Reset the viewport data
                    vm.panes[0].csViewport = null;
                }
            });

            // when the studyIslandsDisplayMode changes, the layout may change and so some directive may need
            // to recalculate their dimensions, so we need to trigger a "window change" event.
            scope.$watch('vm.studyIslandsDisplayMode', function(newValue, oldValue){
                vm.wvViewerController.saveStudyIslandDisplayMode(newValue);
                window.localStorage.setItem("studyIslandsDisplayMode", newValue);
                asap(function(){
                    $(window).trigger("resize");
                });

                // For some weird reason when the webviewer is on an iframe,
                // asap is not working and is possibly triggered not at the good time.
                // To be sure a window resize events is really trigerred we're calling it also after a $timeout
                // Note: we do not remove asap to prevent a flash if the webviewer is not on an iframe.
               $timeout(function() {
                    $(window).trigger("resize");
                });
            });

            console.log('registering media change events');

            function beforePrint(event){
                console.log('beforePrint');
                var $body = $('body');
                $body.addClass("print");

                // because firefox does not support/executes codes after the cloned document as been rendered
                // https://bugzilla.mozilla.org/show_bug.cgi?format=default&id=1048317
                // we cannot calculate using the good body size for the clone document
                // so we have to hardcode the body width (meaning we can only renders in A4 in firefox);
                var uaParser = new UAParser();
                var isFirefox = (uaParser.getBrowser().name === 'Firefox');
                var isIE = (uaParser.getBrowser().name === 'IE');
                var isEdge = (uaParser.getBrowser().name === 'Edge');
                console.log("ua parser", uaParser.getBrowser());
                    $body.css('width', '8.5in');
                    $body.css('height', '11in');
                    // console.log('html size', $html.width(), $html.height());
                

                if(isIE){
                    window.alert($translate.instant('GENERAL_PARAGRAPHS.INCOMPATIBLE_PRINT_BROWSER'));
                }

                console.log('body size', $body.width(), $body.height());
                
                var panes = vm.paneManager.getAllPanes();
                var $splitpane = $("wv-splitpane");
                var splitpaneSize = {width: $splitpane.width(), height: $splitpane.height()}
                var panesCount = {
                    x: vm.tools.layout.x,
                    y: vm.tools.layout.y
                }
        
                for(var i = 0; i < panes.length; i++){
                    var $pane = panes[i];
                    var viewport = vm.viewports[$pane.$$hashKey];
                    var paneSize = {
                        originalWidth: viewport.getCanvasSize().width,
                        originalHeight: viewport.getCanvasSize().height,
                        originalRatio: 0,
                        paneFinalWidth: splitpaneSize.width / panesCount.x,
                        paneFinalHeight: splitpaneSize.height / panesCount.y,
                        paneFinalRatio: 0,
                        canvasFinalWidth: 0,
                        canvasFinalHeight: 0,
                        canvasFinalRatio: 0
                    };
                    paneSize.originalRatio = paneSize.originalWidth / paneSize.originalHeight;
                    paneSize.paneFinalRatio = paneSize.paneFinalWidth / paneSize.paneFinalHeight;

                    if(paneSize.paneFinalRatio > 1){
                        // If pane width ratio means it's width is larger than it's height
                        if(paneSize.paneFinalRatio > paneSize.originalRatio){
                            // the final pane is larger than the original
                            // So we should fit on the height to recalc the ratio
                            console.log('case 1');
                            paneSize.canvasFinalHeight = paneSize.paneFinalHeight;
                            paneSize.canvasFinalWidth = paneSize.canvasFinalHeight * paneSize.originalRatio; // Then we calc the width according the ratio
                        } else {
                            // the final pane is higher than or equal to the original
                            // So we should fit on the width
                            console.log('case 2');
                            paneSize.canvasFinalWidth = paneSize.paneFinalWidth;
                            paneSize.canvasFinalHeight = paneSize.canvasFinalWidth / paneSize.originalRatio; // Then we calc the width according the ratio

                        }
                    } else {
                        // If pane width ratio means it's height is higher than it's height
                        if(paneSize.paneFinalRatio > paneSize.originalRatio){
                            // the final pane is larger than the original
                            // So we should fit on the height to recalc the ratio
                            console.log('case 3');
                            paneSize.canvasFinalHeight = paneSize.paneFinalHeight;
                            paneSize.canvasFinalWidth = paneSize.canvasFinalHeight * paneSize.originalRatio; // Then we calc the width according the ratio
                        } else {
                            // the final pane is higher than or equal to the original
                            // So we should fit on the width
                            console.log('case 4');
                            paneSize.canvasFinalWidth = paneSize.paneFinalWidth;
                            paneSize.canvasFinalHeight = paneSize.canvasFinalWidth / paneSize.originalRatio; // Then we calc the width according the ratio

                        }
                    }
                    
                    paneSize.canvasFinalRatio = paneSize.canvasFinalWidth / paneSize.canvasFinalHeight;
                    console.log('paneSizes:', paneSize, 'splitpaneSize:', splitpaneSize, "panesCount:", panesCount);
                    // viewport.resizeCanvas(paneSize.canvasFinalWidth, paneSize.canvasFinalHeight);
                    // viewport.draw();
                    var $canvas = $("[data-pane-hashkey='" + $pane.$$hashKey + "']").find('canvas');
                    $canvas.width(paneSize.canvasFinalWidth);
                    $canvas.height(paneSize.canvasFinalHeight);
                }
            
            };
        
            function afterPrint(){
                console.log("afterprint");
                var $body = $('body');
                // var $html = $('html');
                $body.removeClass("print");
                $body.css('width', '100%');
                $body.css('height', '100%');
                // $html.css('width', '100%');
                // $html.css('height', '100%');
                $(".wv-cornerstone-enabled-image canvas").css('width', 'auto');
                $(".wv-cornerstone-enabled-image canvas").css('height', 'auto');
                $(window).trigger('resize');  // to force screen and canvas recalculation
            }
        
            window.addEventListener("beforeprint", function(event){
                beforePrint(event)
            })
            var printMedia = window.matchMedia('print');
            printMedia.addListener(function(mql) {
            if(mql.matches) {
                console.log('webkit equivalent of onbeforeprint');
                beforePrint();
            }
            });

           window.addEventListener("afterprint", function(){
                afterPrint();
            });$
        
            vm.cancelPrintMode = function(){
                afterPrint();
            }
        }
    }

    /* @ngInject */
    function Controller($rootScope, $scope, $window) {
        var vm = this;
        vm.window = $window;
    }

})();
