/**
 * @ngdoc directive
 * @name webviewer.directive:wvDraggableItem
 * 
 * @param {object} wvDraggableItem
 * The data to pass along the draggable. The dropped zone (the splitpane's
 * pane) can retrieve them once the draggable has been dropped.
 *
 * If the `wvDraggableItem` value is strictly undefined, the DOM element is no 
 * longer draggable!
 * 
 * @restrict A
 * 
 * @description
 * The `wvDraggableItem` directive let the end-user drag an item from the
 * serieslist and drop it onto the splitpane (for instance).
 **/
 (function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvDraggableItem', wvDraggableItem);

    /* @ngInject */
    function wvDraggableItem($parse) {
        var directive = {
            require: 'wvDraggableItem',
            controller: DraggableItemVM,
            link: link,
            restrict: 'A',
            scope: false
        };
        return directive;

        function link(scope, element, attrs, vm) {
            // Watch `wvDraggableItem` directive attribute value.
            var wvDraggableItemParser = $parse(attrs.wvDraggableItem);
            scope.$watch(wvDraggableItemParser, function(newValue, oldValue) {
                // Switch enable/disable dragging.
                if (newValue === undefined) {
                    vm.disable();
                }
                else {
                    vm.enable();
                }

                // Update dragged data.
                if (newValue !== undefined) {
                    vm.setData(newValue);
                }
            });
        }
    }

    /* @ngInject */
    function DraggableItemVM($rootScope, $scope, $element) {
        var _this = this;

        // Dragged data.
        var _data = undefined;
        this.isEnabled = undefined;

        // Update the data.
        this.setData = function(data) {
            _data = data;
        };

        // Enable/Disable the `dragging` feature.
        this.enable = function() {
            if (this.isEnabled === true) {
                return;
            }

            $element.draggable('enable');

            $element.css('cursor', 'move');
            this.isEnabled = true;
        };
        this.disable = function() {
            if (this.isEnabled === false) {
                return;
            }

            $element.draggable('disable');

            $element.css('cursor', '');
            _data = undefined;
            this.isEnabled = false;
        };

        // Use a clone since canvas can't be dragged.
        var clone = $('<div class="wv-draggable-clone"></div>');

        $element.hover(function() {
            // change border to hovered one
            if (_this.isEnabled) {
                $element.addClass('focused')
            }
        }, function() {
            $element.removeClass('focused');
        });

        // Make the element draggable.
        $element.draggable({
            // Make sure the dragged element is visible everywhere in the app
            helper: function() {
                return clone;
            },
            zIndex: 1000000,
            appendTo: 'body',

            // Set dragged element data information to be retrieved by the 
            // `wvSplitpane`'s pane via the `wvOnItemDropped` callback 
            // attribute.
            start: function(evt, ui) {
                if (!_this.isEnabled) {
                    return;
                }

                var draggedElement = ui.helper;

                // Do not clone _data as it may contains callback/methods. Keep
                // direct reference binding in case of change though. Thus, we
                // must ensure data aren't modified by the droppable zone.
                draggedElement.data('draggableItemData', _data);

                // Update helper to the size of the current element.
                draggedElement.width($element.width());
                draggedElement.height($element.height());
            }
        });

    }
})();