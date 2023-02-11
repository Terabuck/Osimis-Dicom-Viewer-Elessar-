/**
 * @ngdoc directive
 *
 * @name webviewer.directive:wvSize
 * @restrict Attribute
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvSize', wvSize);

    // Inject jquery getHiddenDimensions plugin so resize is calculated well
    // even if ancestor elements are hidden. This happen on mobile when the
    // left area is toggled when switching the mobile between 
    // portait/landscape.
    // see `https://stackoverflow.com/questions/1472303/jquery-get-width-of-element-when-not-visible-display-none`
    (function ($) {
        // Optional parameter includeMargin is used when calculating outer dimensions  
        $.fn.getHiddenDimensions = function (includeMargin) {
            var $item = this,
            props = { position: 'absolute', visibility: 'hidden', display: 'block' },
            dim = { width: 0, height: 0, innerWidth: 0, innerHeight: 0, outerWidth: 0, outerHeight: 0 },
            $hiddenParents = $item.parents().andSelf().not(':visible'),
            includeMargin = (includeMargin == null) ? false : includeMargin;

            var oldProps = [];
            $hiddenParents.each(function () {
                var old = {};

                for (var name in props) {
                    old[name] = this.style[name];
                    this.style[name] = props[name];
                }

                oldProps.push(old);
            });

            dim.width = $item.width();
            dim.outerWidth = $item.outerWidth(includeMargin);
            dim.innerWidth = $item.innerWidth();
            dim.height = $item.height();
            dim.innerHeight = $item.innerHeight();
            dim.outerHeight = $item.outerHeight(includeMargin);

            $hiddenParents.each(function (i) {
                var old = oldProps[i];
                for (var name in props) {
                    this.style[name] = old[name];
                }
            });

            return dim;
        }
    }(jQuery));

    /* @ngInject */
    function wvSize($parse, debounce) {
        /**
         * Generic directive to handle DOM element sizing via JS
         * Can be used by other directives
         */
        var directive = {
            controller: Controller,
            link: {
                pre: preLink
            },
            restrict: 'A',
            scope: false,
            require: 'wvSize',
            priority: 100
        };
        return directive;
    
        // preLink: make sure the element is watching its size only once it has been added to dom.
        function preLink(scope, element, attrs, ctrl) {
            if (!element.parent().length) return;

            var wvSize = $parse(attrs.wvSize);
            
            scope.$watch(wvSize, function (wvSize, old) {
                var width = wvSize.width;
                var height = wvSize.height;

                if (typeof width === 'undefined' || typeof height === 'undefined') {
                    return;
                }

                ctrl.updateSize(width, height);
            }, true);

            // Resize the element when the windows is resized.
            // @warning performance intensive because we do not debounce the 
            // resize event. we must avoid debouncing because most
            // implementations use setTimeout and induce reflows. We may try
            // out an home-made debounce implementation using asap to fix that.
            var whenWindowResizedFn = function() {
                var size = wvSize(scope);
                
                // The dom context may have been resized by window resize if 
                // its size is defined in %. We thus process a resizing only if 
                // the size is not fixed in pixel.
                if (!_isSize(size.width) && !_isSize(size.height)) {
                    ctrl.updateSize(size.width, size.height);
                }
            }
            $(window).on('resize', whenWindowResizedFn);
            scope.$on('$destroy', function() {
                $(window).off('resize', whenWindowResizedFn);
            });
        }
    }

    /* @ngInject */
    function Controller(_, $parse, $scope, $attrs, $element) {
        var wvSize = $parse($attrs.wvSize);
        
        var _onUpdateListeners = [];

        this.onUpdate = function(fn) {
            _onUpdateListeners.push(fn);
            return function unlisten() {
                _.pull(_onUpdateListeners, fn);
            };
        };

        this.updateSize = function(width, height) {
            var _tag = null;

            var setWvSize = wvSize.assign;
            if (setWvSize) {
                // Databind new size. We only use $evalAsync here to avoid it
                // making reflows when changing the element's size.
                $scope.$evalAsync(function() {
                    setWvSize($scope, {
                        width: width,
                        height: height
                    });
                });

                // wvSize change triggers $digest wich trigger _this.updateSize() in $watch
                // @note might slow things down: wait next $digest..
            }
            
            if (_isTag(width) || _isTag(width)) {
                // Retrieve `wv-size-tag` dimensions.
                _tag = _tag || $element.closest('[wv-size-tag]');
                if (!_tag.length) {
                    throw new Error('wv-size#updateSize: [wv-size-tag] not found');
                }
                var dim = _tag.getHiddenDimensions();

                // Update `wvSize` dimensions based on `wv-size-tag` ones.
                if (_isTag(width)) {
                    // @note might cause reflow
                    width = dim.width + 'px';
                }
                if (_isTag(height)) {
                    // @note might cause reflow
                    height = dim.height + 'px';
                }
            }

            if (_isSize(width) && _isSize(height)) {
                this.setSpecificWidthAndSpecificHeight(width, height);
            }
            else if (_isSize(width) && _isScale(height)) {
                this.setSpecificWidthAndScaleHeight(width, height);
            }
            else if (_isSize(height) && _isScale(width)) {
                this.setSpecificHeightAndScaleWidth(height, width);
            }
            else if (_isScale(height) && _isScale(width)) {
                this.scaleHeightAndWidth(height, width);
            }
            else {
                throw new Error("wv-size: unsupported options");
            }
        };

        this.setWidth = function(width) {
            var height = wvSize($scope).height;
            this.updateSize(width, height);
        };

        this.setHeight = function(height) {
            var width = wvSize($scope).width;
            this.updateSize(width, height);
        };

        this.getWidthInPixel = function() {
            var width = wvSize($scope).width;
            if (_isInPixels(width)) {
                return +width.replace('px', '');
            }
            else {
                // @note trigger reflow !
                return +$element.width();
            }
        };
        this.getHeightInPixel = function() {
            var height = wvSize($scope).height;
            if (_isInPixels(height)) {
                return +height.replace('px', '');
            }
            else {
                // @note trigger reflow !
                return +$element.height();
            }
        };

        this.setSpecificWidthAndSpecificHeight = function(width, height) {
            $element.css('width', width);
            $element.css('height', height);

            _onUpdateListeners.forEach(function(listener) {
                listener();
            });
        }

        this.setSpecificWidthAndScaleHeight = function(width, heightScale) {
            var height = width.replace(/^([0-9]+)(\w+)$/, function(match, width, unit) {
                return (width * heightScale) + unit;
            });
            $element.css('width', width);
            $element.css('height', height);

            _onUpdateListeners.forEach(function(listener) {
                listener();
            });
        }

        this.setSpecificHeightAndScaleWidth = function(height, widthScale) {
            var width = height.replace(/^([0-9]+)(\w+)$/, function(match, height, unit) {
                return (height * widthScale) + unit;
            });
            $element.css('height', height);
            $element.css('width', width);

            _onUpdateListeners.forEach(function(listener) {
                listener();
            });
        }

        this.scaleHeightAndWidth = function(heightScale, widthScale) {
            $element.css('height', heightScale * 100 + '%');
            $element.css('width', widthScale * 100 + '%');

            _onUpdateListeners.forEach(function(listener) {
                listener();
            });
        };
    }

    function _isSize(size) {
        return _.isString(size) && size.match(/^[0-9]+\w+$/);
    }

    function _isScale(size) {
        return _.isNumber(size);
    }

    function _isTag(size) {
        return _.isString(size) && size === '[wv-size-tag]';
    }

    function _isInPixels(size) {
        return _.isString(size) && size.match(/^[0-9]+(px)?$/);
    }

})();