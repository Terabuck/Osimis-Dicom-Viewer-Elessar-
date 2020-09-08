(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvWindowingPresetButton', wvWindowingPresetButton);

    /* @ngInject */
    function wvWindowingPresetButton($timeout) {
        var directive = {
            bindToController: true,
            controller: WindowingPresetButtonVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                onWindowingPresetSelected: '&wvOnWindowingPresetSelected',
                windowingPresets: '=wvWindowingPresets',
                selectedTool: '=wvSelectedTool',
                readonly: '=?wvReadonly',
                popoverPlacement: '@?wvPopoverPlacement',
                buttonSize: '@?wvButtonSize'
            },
            templateUrl: 'app/toolbox/windowing-preset-button.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
            var vm = scope.vm;
            vm.buttonSize = vm.buttonSize === undefined ? 'small' : vm.buttonSize;

            var buttonEl = element.children().first();
            
            // Toggle popover on mouse over/out.
            buttonEl.bind('mouseenter', function (e) {
                if (!vm.readonly && !vm.insidePopover) {
                    try {
                        vm.popover.show();
                    }
                    catch (e) {
                        // Ignore `Cannot read property '0' of undefined` exception when 
                        // the button is hovered at app startup. This as no negative
                        // effect.
                    }
                    vm.attachEventsToPopoverContent();
                }
            });

            buttonEl.bind('mouseleave', function (e) {
                // Timeout to make sure the user can move it's cursor from the button
                // to the popover without having the popover to hide in between.
                $timeout(function () {
                    if (!vm.insidePopover) {
                        vm.popover.hide();
                    }
                }, 100);
            });
        }
    }

    /* @ngInject */
    function WindowingPresetButtonVM($q, $element, $scope, $popover, wvPaneManager) {
        var _this = this;
        var buttonEl = $element.children().first();

        this.readonly = typeof this.readonly !== 'undefined' ? this.readonly : false;
        this.popoverPlacement = typeof this.popoverPlacement !== 'undefined' ? this.popoverPlacement : 'bottom';
        this.insidePopover = false;

        // Don't exit popover on when mouse leave the button.
        this.attachEventsToPopoverContent = function () {
            $(_this.popover.$element).on('mouseenter', function () {
                _this.insidePopover = true;
            });
            $(_this.popover.$element).on('mouseleave', function () {
                _this.insidePopover = false;
                _this.popover.hide();
            });
        };
        
        // Popover configuration
        var popoverScope = $scope.$new();
        this.popover = $popover(buttonEl, {
            content: 'Windowing Presets',
            placement: _this.popoverPlacement,
            container: 'body',
            trigger: 'manual',
            templateUrl: 'app/toolbox/windowing-preset-button.popover.html',
            onBeforeShow: function() {
                // @warning The following source code is not databound in real time. If one of the used 
                //    model changes, the windowing presets will only be adapted next time  the popover is
                //    displayed.

                // Clean up scope.
                popoverScope.embeddedWindowings = [];

                // Set up windowing presets.
                popoverScope.windowingPresets = _this.windowingPresets;

                // Set windowings specific to the selected viewport (either preset set in the dicom file
                // or which has been processed by the viewer in the web workers).

                wvPaneManager.getSelectedPane().getEmbeddedWindowingPresetsPromise().then(function(windowingPresets) {
                    popoverScope.embeddedWindowings = windowingPresets;
                });
            },

            // Option documented in `ngTooltip`, not `ngPopover`, see
            // `https://stackoverflow.com/questions/28021917/angular-strap-popover-programmatic-use`.
            scope: popoverScope
        });
        $scope.$on('$destroy', function() {
            popoverScope.$destroy();
        });

        // Apply windowing preset to the selected pane.
        popoverScope.applyWindowing = function(windowWidth, windowCenter) {
            _this.onWindowingPresetSelected({
                $windowWidth: windowWidth,
                $windowCenter: windowCenter
            });
        };
    }
})();
