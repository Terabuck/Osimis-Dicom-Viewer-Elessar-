/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.PaneManager
 *
 * @description
 * The `PaneManager` class is used to manager the content of the panes. It also
 * stores which series/report/video have been viewed.
 */
(function(osimis) {
    'use strict';

    function SeriesPlayer($rootScope, $timeout, wvSynchronizer, wvReferenceLines) {
        // Injections.
        this.$rootScope = $rootScope;
        this.$timeout = $timeout;
        this._isPlaying = false;
        this._isPlayingReverse = false;
        this._cancelAnimationId = null;
        this.wvSynchronizer = wvSynchronizer;
        this.wvReferenceLines = wvReferenceLines;
    }

    SeriesPlayer.prototype.play = function(series) {
        console.log("play", series);

        if (series.imageCount < 2) {
            console.log("series too short to play");
            return;
        }

        if (this._isPlaying) {
            return;
        }

        var lastTimeInMs_ = null;
        var series_ = series;
        var this_ = this;

        // Create recursive closure to display each images
        (function loop() {
            var expectedFrameIntervalInMs = 1000 / series_.frameRate; // Convert framerate FPS into MS
            // Wait for the monitor to attempt refresh
            this_._cancelAnimationId = requestAnimationFrame(function(currentTimeInMs) {
                // Request next frame before anything.
                if (this_._isPlaying) {
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
                if (currentTimeInMs - lastTimeInMs_ >= expectedFrameIntervalInMs) {
                    this_.$rootScope.$apply(function() {
                        // Go to next image
                        series_.goToNextImage(true);
                        this_.wvSynchronizer.update(series_);
                        this_.wvReferenceLines.update(series_);

                        // Benchmark play loop
                        // if (console.time && console.timeEnd) {
                        //     // console.timeEnd(_timeLog);
                        //     _timeLog = 'play (expect ' + Math.round(expectedFrameIntervalInMs) + 'ms)';
                        //     // console.time(_timeLog);
                        // }
                        
                        // Track current time to calculate Frame Rate
                        lastTimeInMs_ = currentTimeInMs;
                    });
                }
            });
        })();
        
        this._isPlaying = true;
        this._isPlayingReverse = false;

    }

    SeriesPlayer.prototype.playReverse = function(series) {
        console.log("play reverse", series);

        if (series.imageCount < 2) {
            console.log("series too short to play");
            return;
        }

        if (this._isPlayingReverse) {
            return;
        }

        var lastTimeInMs_ = null;
        var series_ = series;
        var this_ = this;

        // Create recursive closure to display each images
        (function loopReverse() {
            var expectedFrameIntervalInMs = 1000 / series_.frameRate; // Convert framerate FPS into MS
            // Wait for the monitor to attempt refresh
            this_._cancelAnimationId = requestAnimationFrame(function(currentTimeInMs) {
                // Request next frame before anything.
                if (this_._isPlayingReverse) {
                    loopReverse();
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
                if (currentTimeInMs - lastTimeInMs_ >= expectedFrameIntervalInMs) {
                    this_.$rootScope.$apply(function() {
                        // Go to next image
                        series_.goToPreviousImage(true);
                        this_.wvSynchronizer.update(series_);
                        this_.wvReferenceLines.update(series_);

                        // Benchmark play loop
                        // if (console.time && console.timeEnd) {
                        //     // console.timeEnd(_timeLog);
                        //     _timeLog = 'play (expect ' + Math.round(expectedFrameIntervalInMs) + 'ms)';
                        //     // console.time(_timeLog);
                        // }
                        
                        // Track current time to calculate Frame Rate
                        lastTimeInMs_ = currentTimeInMs;
                    });
                }
            });
        })();
        
        this._isPlaying = false;
        this._isPlayingReverse = true;

    }


    SeriesPlayer.prototype.pause = function(series) {
        console.log("pause", series);

        if (this._cancelAnimationId) {
            cancelAnimationFrame(this._cancelAnimationId);
            this._cancelAnimationId = null;

            // Stop benchmarking play loop
            // if (console.time && console.timeEnd) {
            //     // console.timeEnd(_timeLog);
            //     _timeLog = 'play (expect ? ms)';
            // }
        }

        this._isPlaying = false;
        this._isPlayingReverse = false;
    }

    SeriesPlayer.prototype.isPlaying = function(series) {
        return this._isPlaying;
    }

    SeriesPlayer.prototype.isPlayingReverse = function(series) {
        return this._isPlayingReverse;
    }

    angular
        .module('webviewer')
        .factory('wvSeriesPlayer', wvSeriesPlayer);

    /* @ngInject */
    function wvSeriesPlayer($rootScope, $timeout, wvSynchronizer, wvReferenceLines) {
        return new SeriesPlayer($rootScope, $timeout, wvSynchronizer, wvReferenceLines);
    }
})(osimis || (this.osimis = {}));



        // var _cancelAnimationId = null;
        // var _timeLog;
        // WvSeries.prototype.play = function() {
        //     var _this = this;

        //     // Do nothing when there is only one image
        //     if (this.imageCount < 2) {
        //         return;
        //     }

        //     if (this.isPlaying) {
        //         return;
        //     }

        //     var _lastTimeInMs = null;

        //     // Benchmark play loop
        //     if (console.time && console.timeEnd) {
        //         _timeLog = 'play (expect ? ms)';
        //         // console.time(_timeLog);
        //     }

        //     // Create recursive closure to display each images
        //     (function loop() {
        //         var desiredFrameRateInMs = 1000 / _this.frameRate; // Convert framerate FPS into MS
        //         // Wait for the monitor to attempt refresh
        //         _cancelAnimationId = requestAnimationFrame(function(currentTimeInMs) {
        //             // Request next frame before anything.
        //             if (_this.isPlaying) {
        //                 loop();
        //             }

        //             // In Safari Mobile 10, currentTimeInMs is undefined. This
        //             // bug is undocumented and doesn't seem to be well known.
        //             // We specify the variable value manually to prevent the
        //             // play feature from not working.
        //             if (typeof currentTimeInMs === 'undefined') {
        //                 currentTimeInMs = performance.now();
        //             }

        //             // Draw series at desired framerate (wait for the desired framerate ms time to be passed,
        //             // skip displaying till it has not passed)
        //             if (currentTimeInMs - _lastTimeInMs >= desiredFrameRateInMs) {
        //                 $rootScope.$apply(function() {
        //                     // Go to next image
        //                     _this.goToNextImage(true);

        //                     // Benchmark play loop
        //                     if (console.time && console.timeEnd) {
        //                         // console.timeEnd(_timeLog);
        //                         _timeLog = 'play (expect ' + Math.round(desiredFrameRateInMs) + 'ms)';
        //                         // console.time(_timeLog);
        //                     }
                            
        //                     // Track current time to calculate Frame Rate
        //                     _lastTimeInMs = currentTimeInMs;
        //                 });
        //             }
        //         });
        //     })();
            
        //     this.isPlaying = true;
