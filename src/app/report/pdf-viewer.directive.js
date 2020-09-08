/**
 * angular-pdfjs
 * https://github.com/legalthings/angular-pdfjs
 * Copyright (c) 2015 ; Licensed MIT
 *
 * @ngdoc directive
 * @name webviewer.directive:wvPdfViewer
 *
 * @param {string} wvReportId
 * The id of the PDF report displayed.
 *
 * @description
 * The `wvPdfViewer` directive displays a PDF based on a it's report id. It 
 * fulfill the space of its parent DOM element.
 *
 * Directive taken from `https://github.com/legalthings/angular-pdfjs-viewer/blob/master/src/angular-pdfjs-viewer.js`.
 * Adapted by Osimis:
 * - removal of warnings, errors & related unused features
 * - implementation of user-defined http request headers (integration of
 *   `wvPdfInstanceManager`)
 * - memory cleanup/fixes (when using with `ngIf`)
 * - inlining of webworkers (using Osimis' gulp-inlineWorker plugin).
 */

+function(osimis) {
    'use strict';

    var module = angular.module('webviewer');
    
    module.provider('pdfjsViewerConfig', function() {
        // We inline worker source to avoid CORS issue, and set the path
        // to our configuration. Not sure these worker are used since we bypass
        // the library's file loading mechanism to be able to specify HTTP
        // headers.
        var config = {
            workerSrc: /* @inline-worker: */ '/bower_components/pdf.js-viewer/pdf.worker.js',
            cmapDir: null,
            // imageResourcesPath: null,
            imageDir: 'images/pdf.js-viewer/',
            disableWorker: false,
            verbosity: null
        };

        this.setWorkerSrc = function(src) {
            config.workerSrc = src;
        };
        
        this.setCmapDir = function(dir) {
            config.cmapDir = dir;
        };
        
        this.setImageDir = function(dir) {
            config.imageDir = dir;
        };
        
        this.disableWorker = function(value) {
            if (typeof value === 'undefined') value = true;
            config.disableWorker = value;
        }
        
        this.setVerbosity = function(level) {
            config.verbosity = level;
        };
        
        this.$get = function() {
            return config;
        }
    });
    
    module.run(['pdfjsViewerConfig', function(pdfjsViewerConfig) {
        if (pdfjsViewerConfig.workerSrc) {
            PDFJS.workerSrc = pdfjsViewerConfig.workerSrc;
        }

        if (pdfjsViewerConfig.cmapDir) {
            PDFJS.cMapUrl = pdfjsViewerConfig.cmapDir;
        }

        if (pdfjsViewerConfig.imageDir) {
            PDFJS.imageResourcesPath = pdfjsViewerConfig.imageDir;
        }
        
        if (pdfjsViewerConfig.disableWorker) {
            PDFJS.disableWorker = true;
        }

        if (pdfjsViewerConfig.verbosity !== null) {
            var level = pdfjsViewerConfig.verbosity;
            if (typeof level === 'string') level = PDFJS.VERBOSITY_LEVELS[level];
            PDFJS.verbosity = pdfjsViewerConfig.verbosity;
        }
    }]);
    
    module.directive('wvPdfViewer', ['$interval', 'wvPdfInstanceManager', function ($interval, wvPdfInstanceManager) {
        return {
            templateUrl: 'app/report/pdf-viewer.directive.html',
            restrict: 'E',
            scope: {
                // onInit: '&?', Osimis - not used anymore
                // onPageLoad: '&?', Osimis - not used anymore
                // scale: '=?', Osimis - not used anymore
                reportId: '=wvReportId'
            },
            link: function ($scope, $element, $attrs) {
                $element.children().wrap('<div class="pdfjs" style="width: 100%; height: 100%;"></div>');
                
                // Close when users clicks on the close button
                $scope.close = function() {
                    $scope.reportId = undefined;
                };

                // Document title be changed by the pdf library. Store it
                // so we can set it back when the viewer is closed.
                var _documentTitle = document.title;

                $scope.$on('$destroy', function() {
                    // Disable recurrent PDFJS window resize event listeners 
                    // console errors..
                    PDFViewerApplication.close();

                    // Set document title back.
                    document.title = _documentTitle;
                });

                /**************************************************************
                // We comment features we don't use and poll of useless 
                // warnings related to the pdf having not been loaded yet.
                // Especially since some of the features may have impacts on 
                // global event scope.

                var initialised = false;
                var loaded = {};
                var numLoaded = 0;

                function onPdfInit() {
                    initialised = true;
                    
                    if ($attrs.removeMouseListeners === "true") {
                        window.removeEventListener('DOMMouseScroll', handleMouseWheel);
                        window.removeEventListener('mousewheel', handleMouseWheel);
                        
                        var pages = document.querySelectorAll('.page');
                        angular.forEach(pages, function (page) {
                            angular.element(page).children().css('pointer-events', 'none');
                        });
                    }
                    if ($scope.onInit) $scope.onInit();
                }

                var poller = $interval(function () {
                    var pdfViewer = PDFViewerApplication.pdfViewer;
                    
                    if (pdfViewer) {
                        if ($scope.scale !== pdfViewer.currentScale) {
                            loaded = {};
                            numLoaded = 0;
                            $scope.scale = pdfViewer.currentScale;
                        }
                    } else {
                        console.warn("PDFViewerApplication.pdfViewer is not set");
                    }
                    
                    var pages = document.querySelectorAll('.page');
                    angular.forEach(pages, function (page) {
                        var element = angular.element(page);
                        var pageNum = element.attr('data-page-number');
                        
                        if (!element.attr('data-loaded')) {
                            delete loaded[pageNum];
                            return;
                        }
                        
                        if (pageNum in loaded) return;

                        if (!initialised) onPdfInit();
                        
                        if ($scope.onPageLoad) {
                            if ($scope.onPageLoad({page: pageNum}) === false) return;
                        }
                        
                        loaded[pageNum] = true;
                        numLoaded++;
                    });
                }, 200);


                $element.on('$destroy', function() {
                    $interval.cancel(poller);
                });
                **************************************************************/

                $scope.$watch(function () {
                    return $scope.reportId;
                }, function (newReportId, oldReportId) {
                    // When reportId has been set to undefined, close the doc.
                    if (!newReportId) {
                        // Free resources
                        if (oldReportId) {
                            PDFViewerApplication.close();
                        }

                        // Set document title back.
                        document.title = _documentTitle;

                        return;
                    };

                    // Update document title cache variable each time a file is 
                    // opened. This line is strictly for safety since the 
                    // document title is static at the moment.
                    _documentTitle = document.title;

                    // @warning Untested behavior: pdfUrl changes from
                    // one to another. It will not happen in the current state
                    // of the app since UI can't allow that behavior. This kind
                    // of issue may occurs back for instance if lify is given
                    // the power to switch between displayed dicom instances.

                    // Make sure the open file button is disabled!
                    if ($attrs.open === 'false' || typeof $attrs.open === 'undefined') {
                        document.getElementById('openFile').setAttribute('hidden', 'true');
                        document.getElementById('secondaryOpenFile').setAttribute('hidden', 'true');
                    }

                    // Let download the file by default
                    if ($attrs.download === 'false') {
                        document.getElementById('download').setAttribute('hidden', 'true');
                        document.getElementById('secondaryDownload').setAttribute('hidden', 'true');
                    }

                    // Let print the file by default
                    if ($attrs.print === 'false') {
                        document.getElementById('print').setAttribute('hidden', 'true');
                        document.getElementById('secondaryPrint').setAttribute('hidden', 'true');
                    }

                    if ($attrs.width) {
                        document.getElementById('outerContainer').style.width = $attrs.width;
                    }
                    if ($attrs.height) {
                        document.getElementById('outerContainer').style.height = $attrs.height;
                    }
                    
                    // Send null adress so it doesn't load the pdf. We want to 
                    // avoid this behavior because we have to send the correct
                    // http headers with the request, so authentification can
                    // occur.
                    DEFAULT_URL = null;
                    PDFJS.webViewerLoad(null);

                    // `PDFViewerApplication.open(pdfUrl, 0);` open and parse
                    // the URL in a worker. We can't use it. It seems there is
                    // no interface to configure the http headers. We can 
                    // though use `PDFViewerApplication.open(dataPtr, 0);`
                    // and download the pdf ourself, and process a binary blob
                    // directly in the current thread. Also, required for
                    // QtWebKit, because it cannot load file:-URLs in a Web
                    // Worker.
                    // 
                    // As stated in `pdf.js` source code.
                    // 
                    // > file:-scheme. Load the contents in the main thread because QtWebKit
                    // > cannot load file:-URLs in a Web Worker. file:-URLs are usually loaded
                    // > very quickly, so there is no need to set up progress event listeners.

                    // Load the PDF file with the correct headers & display the
                    // pdf once loaded.
                    wvPdfInstanceManager
                        .getPdfBinary(newReportId)
                        .then(function(pdfBlob) {
                            // Cancel viewing if reportId has changed since then,
                            // so we don't have sync issues.
                            if ($scope.reportId !== newReportId) {
                                return;
                            }

                            // Display PDF inside the PDF viewer
                            var arrayView = new Uint8Array(pdfBlob);
                            PDFViewerApplication.open(arrayView, 0);
                        });
                    
                    // @todo process request error
                });
            }
        };
    }]);

}(this.osimis || (this.osimis = {}));
