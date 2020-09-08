/**
 * @ngdoc directive
 * @name webviewer.directive:wvReflowOnChange
 *
 * @restrict Attribute
 *
 * @param {any} wvReflowOnChange
 * A databound variable the directive listen to. For instance, it may be an
 * array containing multiple scope variables to watch.
 *
 * @description
 * The `wvReflowOnChange` directive triggers window resize events when observed
 * attributes changes. It makes sure only one window.resize event is triggered
 * by digest cycle.
 * It is also helpful to make sure the resize event is send at the end of the
 * digest cycle, and thus prevent from reading DOM elements' size/position 
 * before they have been set.
 * 
 * In the end, the `wvReflowOnChange` directive helps avoiding reflow and
 * interface sync issues.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvReflowOnChange', wvReflowOnChange);

    /* @ngInject */
    function wvReflowOnChange() {
        var directive = {
            bindToController: true,
            controller: ReflowOnChangeVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'A',
            scope: false,
            priority: -1000
        };
        return directive;

        function link(scope, element, attrs) {
            // Deep watch for change in the wvReflowOnChange attribute
            scope.$watch(attrs['wvReflowOnChange'], function(a, b) {
                // Skip the initial phase, only listen to effective changes.
                if (_.isEqual(a, b)) {
                    return;
                }

                // Trigger window resize at each change
                console.log('trigger reflow');
                $(window).trigger('resize');
            }, true);
        }
    }

    /* @ngInject */
    function ReflowOnChangeVM() {

    }
})();