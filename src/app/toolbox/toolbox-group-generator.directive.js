/**
 * @ngdoc directive
 * @name webviewer.toolbox.directive:wvToolbox
 * 
 * @restrict Element
 * @scope
 *
 * @param {object} group
 * The button object containing the type="group" and the list of buttons=[{}button]
 *
 * @description
 * The `wvToolboxGroupGenerator` directive return the generated group for the group pass as argument
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
        .directive('wvToolboxGroupGenerator', wvToolboxGroupGenerator);

    /* @ngInject */
    function wvToolboxGroupGenerator($timeout) {
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
                group: '=wvGroup',
                isOpen: '=?wvIsOpen'
            },
            templateUrl: 'app/toolbox/toolbox-group-generator.directive.html'
        };
        return directive;

        function link(scope, element, attrs, ctrls) {
            var vm = scope.vm;
            vm.toolbox = ctrls.wvToolboxCtrl;
            scope.$watch('vm.toolbox.tool', function(newValue, oldValue){
                if(newValue === oldValue){return;}
                if(!vm.isToolInGroup(newValue)){
                    vm.isOpen = false;
                }
            });
        }
    }

    /* @ngInject */
    function toolboxGeneratorController($element, $scope, $popover, $rootScope) {
        var _this = this;

        /**
         * Make only one group open at the same time
         * 
         * 1. generate an event that will be sent when the group is open (with the group as param)
         * 2. listen to this event, if the group of the param is not the same of the group in this scope
         *    then we close it.
         */
        $rootScope.$on('wvToolbarGroupOpen', function($event, group){
            if(group !== _this.group){
                _this.isOpen = false;
            }
        });
        $scope.$watch('vm.isOpen', function(newValue, oldValue){
            if(newValue){
                $rootScope.$emit('wvToolbarGroupOpen', _this.group);
            }
        });

        _this.isToolInGroup = function(tool){
            var isInGroup = false;
            _this.group.buttons.forEach(function(button) {
                if(button.tool === tool){
                    isInGroup = true;
                }
            });
            return isInGroup
        }
    }
})();
