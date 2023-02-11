/**
 * @ngdoc directive
 * @name webviewer.toolbox.directive:wvKeyimagenoteButton
 * 
 * @restrict Element
 * @scope
 *
 * @description
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvKeyimagenoteButton', wvKeyimagenoteButton);

    /* @ngInject */
    function wvKeyimagenoteButton($timeout) {
        var directive = {
            bindToController: true,
            controller: KeyImageNoteButtonVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                readonly: '=?wvReadonly',
                popoverPlacement: '@?wvPopoverPlacement',
                onKeyimagenoteCreated: '&onKeyimagenoteCreated',
                buttonSize: '@?wvButtonSize'
            },
            templateUrl: 'app/toolbox/keyimagenote-button.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
            var vm = scope.vm;

            var buttonEl = element.children().first();
            
            vm.buttonSize = vm.buttonSize === undefined ? 'small' : vm.buttonSize;

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
    function KeyImageNoteButtonVM($element, $scope, $popover, wvPaneManager, wvKeyboardShortcutEventManager) {
        var _this = this;
        var buttonEl = $element.children().first();

        this.readonly = typeof this.readonly !== 'undefined' ? this.readonly : false;
        this.popoverPlacement = typeof this.popoverPlacement !== 'undefined' ? this.popoverPlacement : 'bottom';
        this.insidePopover = false;
        this.onExportEnded = function(){
            _this.popover.hide();
            if(_this.onKeyimagenoteCreated){
                _this.insidePopover = false;                
                _this.onKeyimagenoteCreated();
            }
        }

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
        this.popover = $popover($element.children().first(), {
            // title: 'Viewport Grid\'s Layout',
            placement: _this.popoverPlacement,
            container: 'body',
            trigger: 'manual',
            templateUrl: 'app/toolbox/keyimagenote-button.popover.html',

            // Option documented in `ngTooltip`, not `ngPopover`, see
            // `https://stackoverflow.com/questions/28021917/angular-strap-popover-programmatic-use`.
            scope: popoverScope,
            onShow : function() {
                wvKeyboardShortcutEventManager.disableKeyboardShortucts();
            },
            onHide : function() {
                wvKeyboardShortcutEventManager.enableKeyboardShortucts();
            },
            onBeforeShow: function() {
                // @warning The following source code is not databound in real time. If one of the used 
                //    model changes, the windowing presets will only be adapted next time  the popover is
                //    displayed.

                // Clean up scope.
                popoverScope.viewport = null;
                popoverScope.imageId = null;

                // Set windowings specific to the selected viewport (either preset set in the dicom file
                // or which has been processed by the viewer in the web workers).
                var selectedPane = wvPaneManager.getSelectedPane();
                popoverScope.viewport = selectedPane.csViewport;
                selectedPane
                    .getImage()
                    .then(function(image) {
                        if (!image) {
                            return;
                        }
                        popoverScope.onExportEnded = _this.onExportEnded;
                        popoverScope.imageId = image.id;
                    });
            }
        });
        $scope.$on('$destroy', function() {
            popoverScope.$destroy();
        });
    }
})();