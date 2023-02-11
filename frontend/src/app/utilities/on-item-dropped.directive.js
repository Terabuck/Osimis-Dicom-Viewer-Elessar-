/**
 * @ngdoc directive
 * @name webviewer.directive:wvOnItemDropped
 * 
 * @param {callback} wvOnItemDropped
 * THe `wvItemDropped` callback is called everytime an item is dropped on the
 * current pane. Items are defined via the `wvSplitpaneDraggable` directive
 * (see related documentation for more info).
 * 
 * Callback attributes arguments:
 * 
 * * `$data` - the data provided along the dropped item
 * 
 * @restrict A
 * 
 * @description
 * The `wvOnItemDropped` directive let the end-user drag an item from the
 * serieslist and drop it onto the splitpane (for instance).
 **/
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvOnItemDropped', wvOnItemDropped);

    /* @ngInject */
    function wvOnItemDropped($parse) {
        var directive = {
            bindToController: true,
            controller: OnItemDroppedVM,
            link: link,
            restrict: 'A',
            scope: false
        };
        return directive;

        function link(scope, element, attrs) {
            var _onItemDropped = $parse(attrs.wvOnItemDropped);
            
            // Assert
            if (!_onItemDropped) {
                throw new Error('wvOnItemDropped value is mandatory.');
            }

            // Make the element droppable.
            element.droppable({
                accept: '[wv-draggable-item]',
                drop: function(evt, ui) {
                    // Retrieve dragged item's data.
                    var droppedElement = $(ui.helper);
                    var itemData = droppedElement.data('draggableItemData');

                    // Call the `wvOnItemDropped` callback.
                    scope.$apply(function() {
                        _onItemDropped(scope, {
                            $data: itemData
                        });
                    });
                }
            });
        }
    }

    /* @ngInject */
    function OnItemDroppedVM() {

    }
})();