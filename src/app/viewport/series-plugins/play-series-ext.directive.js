/**
 * @deprecated we use series.play() method instead
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvPlaySeriesExt', wvPlaySeriesExt)
        .config(function($provide) {
            $provide.decorator('vpSeriesIdDirective', function($delegate) {
                var directive = $delegate[0];
                directive.require['wvPlaySeriesExt'] = '?^wvPlaySeriesExt';

                return $delegate;
            });
        });

    /* @ngInject */
    function wvPlaySeriesExt($parse) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            require: 'wvPlaySeriesExt',
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };
        return directive;

        function link(scope, element, attrs, tool) {
            var wvPlaySeriesExtParser = $parse(attrs.wvPlaySeriesExt);
            
            // bind attributes -> tool
            scope.$watch(wvPlaySeriesExtParser, function(isActivated) {
                if (isActivated) {
                    tool.activate();
                }
                else {
                    tool.deactivate();
                }
            });
        }
    }

    /* @ngInject */
    function Controller($scope, $element, $attrs) {
        var _this = this;

        var _wvSeriesIdViewModels = [];

        this.isActivated = false;

        this.register = function(viewmodel) {
            _wvSeriesIdViewModels.push(viewmodel);

            var series = viewmodel.getSeries();
            if (this.isActivated && series) {
                this.activate(series);
            }
            
            viewmodel.onSeriesChanged(this, function(newSeries, oldSeries) {
                if (oldSeries && _this.isActivated) {
                    _this.deactivate(oldSeries);
                }
                if (newSeries && _this.isActivated) {
                    _this.activate(newSeries);
                }
            });
        };
        this.unregister = function(viewmodel) {
            _.pull(_wvSeriesIdViewModels, viewmodel);
            
            viewmodel.onSeriesChanged.close(this);
            var series = viewmodel.getSeries();
            this.deactivate(series);
        };

        this.activate = function(series) {
            if (typeof series === 'undefined') {
                _wvSeriesIdViewModels.forEach(function(vm) {
                    var series = vm.getSeries();
                    _this.activate(series)
                });
                this.isActivated = true;
            }
            else {
                if (series && !series.isPlaying) {
                    series.play();
                }
            }
        };
        this.deactivate = function(series) {
            if (typeof series === 'undefined') {
                _wvSeriesIdViewModels.forEach(function(vm) {
                    var series = vm.getSeries();
                    _this.deactivate(series)
                });
                this.isActivated = false;
            }
            else {
                if (series && series.isPlaying) {
                    series.pause();
                }
            }
        };

    }
})();
