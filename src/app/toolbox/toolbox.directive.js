/**
 * @ngdoc directive
 * @name webviewer.toolbox.directive:wvToolbox
 * 
 * @restrict Element
 *
 * @param {string} [wvPosition='top']
 * The toolbar position on the screen. Note the toolbar is absolutely
 * positioned.
 * 
 * Can either be:
 * 
 * * `top`
 * * `right`
 *
 * @param {Array<Object {{string} name, {number} windowWidth, {number} windowCenter}>} wvWindowingPresets
 * Sets the list of windowing presets. This parameter will most likely be set
 * via the backend json configuration file or resolve into a default list (set
 * from the backend).
 */
(function () {
    'use strict';

    angular
        .module('webviewer.toolbox')
        .directive('wvToolbox', wvToolbox);

    /* @ngInject */
    function wvToolbox($timeout) {
        var directive = {
            bindToController: true,
            controller: toolboxCtrl,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                buttons: '=wvToolboxButtons', // input + output
                buttonsOrdering: '=wvToolboxButtonsOrdering',
                buttonsSize: '=?wvToolboxButtonsSize',  
                customCommandIconLabel: '=?wvCustomCommandIconLabel',
                customCommandIconClass: '=?wvCustomCommandIconClass',
                tool: '=?wvActiveTool', // output (duplicate with buttons as an output
                onActionClicked: '&?wvOnActionClicked', 
                windowingPresets: '=wvWindowingPresets',
                onWindowingPresetSelected: '&?wvOnWindowingPresetSelected',
                position: '=?wvPosition',
                layoutMode: '=?wvLayoutMode',  // flat | tree
                // - avoid lifecycle ordering issue when switching tool though, for instance
                // deactivated tool always occurs before the activation of another one)
                readonly: '=?wvReadonly' // default: false
            },
            templateUrl: 'app/toolbox/toolbox.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
            var vm = scope.vm || {};

            vm.layoutMode = vm.layoutMode === undefined ? 'flat': vm.layoutMode;

            vm.position = typeof vm.position !== 'undefined' ? vm.position : 'top';
            vm.readonly = typeof vm.readonly !== 'undefined' ? vm.readonly : false;

            vm.tool = vm.tool || 'zoom';
            vm.state = {
                invert: false
            };

            // Propagate buttons to tool/state (for liveshare)
            scope.$watch('vm.buttons', function (buttons) {
                for (var label in buttons) {
                    if (vm.state.hasOwnProperty(label)) {
                        vm.state[label] = buttons[label];
                    }
                    else {
                        // vm.tool = buttons[label];
                        // already done in js
                    }
                }
            }, true);

            // @todo refactor
            scope.$watch('vm.state', function (states) {
                for (var state in states) {
                    vm.buttons[state] = states[state];
                }
            }, true);

            scope.$watch('vm.tool', function (tool, oldTool) {
                if (tool == oldTool) return;

                if (vm.buttons.hasOwnProperty(oldTool)) {
                    if (typeof vm.buttons[oldTool] === 'boolean') {
                        vm.buttons[oldTool] = false;
                    }
                    else if (typeof vm.buttons[oldTool] === 'object') {
                        vm.buttons[oldTool].enabled = false;
                    }
                }
                $timeout(function () {
                    if (vm.buttons.hasOwnProperty(tool)) {
                        if (typeof vm.buttons[tool] === 'boolean') {
                            vm.buttons[tool] = true;
                        }
                        else if (typeof vm.buttons[tool] === 'object') {
                            vm.buttons[tool].enabled = true;
                        }
                    }
                });

            });
        }
    }

    /* @ngInject */
    function toolboxCtrl($element, wvSynchronizer, wvReferenceLines, wvViewerController) {
        var _this = this;
        this.wvSynchronizer = wvSynchronizer;
        this.wvReferenceLines = wvReferenceLines;
        this.wvViewerController = wvViewerController;

        // Apply windowing preset to the selected pane.
        this.applyWindowing = function(windowWidth, windowCenter) {
            _this.onWindowingPresetSelected({
                $windowWidth: windowWidth,
                $windowCenter: windowCenter
            });
        };
    }

})();
