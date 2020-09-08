/**
 * @ngdoc directive
 * @name webviewer.directive:wvScrollOnOverSeriesExt
 *
 * @restrict Attribute
 * @requires webviewer.directive:wvViewport
 * @requires webviewer.directive:vpSeriesId
 *
 * @description
 * The `wvScrollOnOverSeriesExt` attribute directive plays images across a  
 * series when the viewport is hovered. It starts from the first series' image 
 * and display back the middle image once the mouse is not on top of the 
 * viewport anymore.
 *
 * The directive attribute can either be set on a viewport or on a parent
 * element. In the second case, the parent will be used to watch the mouse
 * pointer.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvScrollOnOverSeriesExt', wvScrollOnOverSeriesExt)
        .config(function($provide) {
        	$provide.decorator('vpSeriesIdDirective', function($delegate) {
			    var directive = $delegate[0];
		    	directive.require['wvScrollOnOverSeriesExt'] = '?^wvScrollOnOverSeriesExt';

                return $delegate;
        	});
        });

    /* @ngInject */
    function wvScrollOnOverSeriesExt() {
        var directive = {
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false
        };
        return directive;

        function link(scope, element, attrs) {
        }
    }

    /* @ngInject */
    function Controller($scope, $element, $attrs) {
        var _wvSeriesIdViewModels = [];
    	this.register = function(viewmodel) {
            _wvSeriesIdViewModels.push(viewmodel);
    	};
    	this.unregister = function(viewmodel) {
            _.pull(_wvSeriesIdViewModels, viewmodel);
    	};

        $element
            .on('mouseover', mouseoverEvt)
            .on('mouseout', mouseoutEvt);

        $scope.$on('$destroy', function() {
            _wvSeriesIdViewModels.forEach(function(viewmodel) {
                var series = viewmodel.getSeries();
                if (!series) {
                    return;
                }
                series.pause();
            });
            $element.off('mouseover', mouseoverEvt);
            $element.off('mouseout', mouseoutEvt);
        });

        function mouseoverEvt() {
            $scope.$apply(function() {
                _wvSeriesIdViewModels.forEach(function(viewmodel) {
                    var series = viewmodel.getSeries();
                    if (!series) {
                        return;
                    }
                    
                    series.goToImage(0); // start from first image
                    series.playPreview();
                });
            });
        }
        function mouseoutEvt() {
            $scope.$apply(function() {
                _wvSeriesIdViewModels.forEach(function(viewmodel) {
                    var series = viewmodel.getSeries();
                    if (!series) {
                        return;
                    }

                    series.pausePreview();
                    series.goToImage(series.imageCount/2); // go back to middle image
                });
            });
        }
    }
})();