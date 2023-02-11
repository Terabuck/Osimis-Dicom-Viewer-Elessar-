/**
 * @ngdoc directive
 * @name webviewer.directive:wvSelectionActionlist
 * 
 * @restrict Element
 *
 * @scope
 *
 * @param {boolean} [wvSelectionEnabled=false]
 * The selection's action list has two modes: `actived`, and `deactivated`. 
 * This parameter is the switch between these modes. When `wvSelectionEnabled`
 * is false, a button to enable the selection appears, when the user clicks on
 * it, the parameter value is toggled, and the actions appears.
 *
 * @param {Array<any>} [wvData=EmptyArray]
 * When the user clicks on the `reset` button, this parameter is reset to `[]`.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvSelectionActionlist', wvSelectionActionlist);

    /* @ngInject */
    function wvSelectionActionlist() {
        var directive = {
            bindToController: true,
            controller: SelectionActionListVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                selectionEnabled: '=?wvSelectionEnabled',
                data: '=?wvData',
            },
            transclude: true,
            templateUrl: 'app/serieslist/selection-actionlist.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
        }
    }

    /* @ngInject */
    function SelectionActionListVM() {
        this.selectionEnabled = typeof this.selectionEnabled !== 'undefined' ? this.selectionEnabled : false;
    }
})();