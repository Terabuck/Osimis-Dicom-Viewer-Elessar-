/**
 * @ngdoc directive
 * @name webviewer.directive:wvExitButton
 * 
 * @restrict Element
 * 
 * @scope
 * 
 * @param {callback} ngClick
 * Use standard angular `ng-click` to provide a behavior to this button
 *
 * @description
 * A simple button to exit the viewer. It does not has any logic, it's just a
 * template aim to be used as such:
 *
 * * Execute context-related action when embedded in an host application.
 * * Close the current window otherwise
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvExitButton', wvExitButton);

    wvExitButton.$inject = [];

    /* @ngInject */
    function wvExitButton() {
        var directive = {
            bindToController: true,
            controller: ExitButtonVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
            },
            templateUrl: 'app/utilities/exit-button.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
        }
    }

    /* @ngInject */
    function ExitButtonVM() {

    }
})();