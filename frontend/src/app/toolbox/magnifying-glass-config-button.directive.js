(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvMagnifyingGlassConfigButton', wvMagnifyingGlassConfigButton);

    /* @ngInject */
    function wvMagnifyingGlassConfigButton($timeout) {
        var directive = {
            bindToController: true,
            controller: MagnifyingGlassConfigButtonVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                selectedTool: '=wvSelectedTool',
                magnificationLevel: '=wvMagnificationLevel',
                magnifyingGlassSize: '=wvMagnifyingGlassSize',
                readonly: '=?wvReadonly',
                popoverPlacement: '@?wvPopoverPlacement',
                buttonSize: '@?wvButtonSize'
            },
            templateUrl: 'app/toolbox/magnifying-glass-config-button.directive.html'
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
    function MagnifyingGlassConfigButtonVM($q, $element, $scope, $popover, wvPaneManager) {
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
            placement: _this.popoverPlacement,
            container: 'body',
            trigger: 'manual',
            templateUrl: 'app/toolbox/magnifying-glass-config-button.popover.html',
            onBeforeShow: function() {
                // @warning The following source code is not databound in real time.

                // Clean up scope.
                // popoverScope.embeddedWindowings = [];
                // vm.magnificationLevel inherited
                // vm.magnifyingGlassSize inherited
            },

            // Option documented in `ngTooltip`, not `ngPopover`, see
            // `https://stackoverflow.com/questions/28021917/angular-strap-popover-programmatic-use`.
            scope: popoverScope
        });
        $scope.$on('$destroy', function() {
            popoverScope.$destroy();
        });

        // var values = {
        //     enabled: false,
        //     magnificationLevel: 5
        //     magnifyingGlassSize: 400
        // };
    }
})();
