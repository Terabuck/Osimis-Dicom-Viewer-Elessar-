/**
 * @ngdoc directive
 *
 * @name webviewer.directive:wvPanePolicy
 * 
 * @param {object} [wvPanePosition] (readonly)
 * Provide the position of the pane within the splitpane
 * 
 * * `x` The column index - starts from 0
 * * `y` The row index - starts from 0
 *
 * @param {osimis.Pane} [wvPane] (readonly)
 * The pane object.
 * 
 * @requires webviewer.directive:wvSplitpane
 * @restrict Element
 * @scope
 * 
 * @description
 * The `wvPanePolicy` directive configure the content of the `wvSplitpane` directive.
 * It provides standard access to the user scope. Pane properties can be retrieved
 * via additional attributes.
 **/
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvPanePolicy', wvPanePolicy);

    /* @ngInject */
    function wvPanePolicy(wvPaneManager) {
        var directive = {
            bindToController: true,
            controller: Controller,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            require: {
                splitpane: '^^wvSplitpane'
            },
            scope: {
                pane: '=?wvPane',
                panePosition: '=?wvPanePosition',
            },
            transclude: true,
            templateUrl: 'app/splitpane/pane-policy.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
            var vm = scope.vm;
            
            // Retrieve the splitpane ng-repeat context scope to access the
            // position of the pane within the splitpane.
            //
            // Using $parent is the simplest way to retrieve the ng-repeat
            // context scope from wvSplitpane The first $parent is used to get
            // out of wvPanePolicy directive isolate scope The second $parent
            // is used to get out of wvPanePolicy transclusion scope It won't
            // ever cause any issues in this case, especially because the
            // wvPanePolicy directive is also a transclusion slot of
            // wvSplitpane (its position in the dom will therefore always be
            // the same), and because the wvSplitpane and wvPanePolicy
            // directives are interdependent.
            //
            // The other way arounds to avoid using $parent are:
            // 1. make wvPanePolicy act as ng-repeat and share the desired
            //    context scope to wvSplitpane through inter-directive
            //    communication using `require`.
            // 2. override the standard transclusion scope behavior using a
            //    transclusion function in wvSplitpane and don't use an isolate
            //    scope for the wvPanePolicy directive.
            var contextScope = scope.$parent.$parent;
            
            // Configure `pane` and `panePosition`

            // Set wvPanePolicy directive attributes based on $pane from
            // wvSplitpane context.
            var _unlisten = contextScope.$watchGroup([
                '$pane.x',
                '$pane.y'
            ], function(newValues) {
                var $x = newValues[0];
                var $y = newValues[1];
                
                vm.panePosition = {
                    x: $x,
                    y: $y
                };

                vm.pane = wvPaneManager.getPane($x, $y);

                // Add pane index in element so WVP can retrieve it for
                // liveshare cursor sync.
                var paneIndex = wvPaneManager.panes.indexOf(vm.pane);
                element.data('indexInSplitpane', paneIndex);
            });
            scope.$on('$destroy', function() {
                _unlisten();
            });
        }
    }

    /* @ngInject */
    function Controller() {
    }
})();