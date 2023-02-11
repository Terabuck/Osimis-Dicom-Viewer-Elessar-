/**
 * @ngdoc directive
 * @name webviewer.toolbox.directive:wvToolbox
 * 
 * @restrict Element
 * @scope
 *
 * @param {object} button
 * The button object containing the type="button" and the tool="nameOfTheTool"
 *
 * @description
 * The `wvToolboxButtonGenerator` directive return the correct button for the button pass as argument
 *
 * It is purely an UI component though. And required to be set inside the toolbox (because we're requiring it)
 * 
 * 
* @requires webviewer.toolbox.directive:wvToolbox
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvToolboxButtonGenerator', wvToolboxButtonGenerator);

    /* @ngInject */
    function wvToolboxButtonGenerator($timeout) {
        var directive = {
            bindToController: true,
            controller: toolboxGeneratorController,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            require: {
                'wvToolboxCtrl': '^^wvToolbox', // Ctrl postfix to avoid conflict w/ scope attribute
            },
            scope: {
                button: '=wvButton'
            },
            templateUrl: 'app/toolbox/toolbox-button-generator.directive.html'
        };
        return directive;

        function link(scope, element, attrs, ctrls) {
            var vm = scope.vm;
            vm.toolbox = ctrls.wvToolboxCtrl;
        }
    }

    /* @ngInject */
    function toolboxGeneratorController($element, $scope, $popover, $window) {
        var _this = this;
        _this.window = $window
    }
})();