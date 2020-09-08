(function () {
    'use strict';

    angular
        .module('webviewer.layout')
        .directive('wvLayout', wvLayout);

    /* @ngInject */
    function wvLayout() {
        var directive = {
            bindToController: true,
            controller: layoutCtrl,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            transclude: true,
            scope: {
                // Those parameters are readonly, they must be configured via
                // their respective directives. We provide them because the
                // configuration can be done outside the scope of the
                // `wvWebviewer` directive. This is the case when the user
                // redefine a specific section.
                isTopEnabled: '=?wvTopEnabled', // readonly
                isTopLeftEnabled: '=?wvTopleftEnabled', // readonly
                isTopRightEnabled: '=?wvToprightEnabled', // readonly
                isRightEnabled: '=?wvRightEnabled', // readonly
                isRightClosed: '=?wvRightClosed', // readonly
                isBottomEnabled: '=?wvBottomEnabled', // readonly
                isLeftEnabled: '=?wvLeftEnabled', // readonly
                isLeftBottomEnabled: '=?wvLeftBottomEnabled', // readonly
                isLeftClosed: '=?wvLeftClosed', // readonly
                isLeftSmall: '=?wvIsLeftSmall' //readonly
            },
            templateUrl: 'app/layout/layout.html'
        };
        return directive;

        function link(scope, element, attrs) {

        }
    }

    /* @ngInject */
    function layoutCtrl($scope) {
        var _this = this;

        // This will be updated by children directives
        this.isTopEnabled = undefined;
        this.isTopLeftEnabled = undefined;
        this.isTopRightEnabled = undefined;
        this.isRightEnabled = undefined;
        this.isRightClosed = undefined;
        this.isBottomEnabled = undefined;
        this.isLeftEnabled = undefined;
        this.isLeftBottomEnabled = undefined;
        this.isLeftClosed = undefined;

        // Trigger window resizes (so javascript canvas can be resized
        // adequately). We do this after the digest cycle but prior to
        // the reflow, using asap.
        // asap(function() {
        $scope.$watchGroup([
            'vm.isTopEnabled',
            'vm.isTopLeftEnabled',
            'vm.isTopRightEnabled',
            'vm.isRightEnabled',
            'vm.isRightClosed',
            'vm.isBottomEnabled',
            'vm.isLeftEnabled',
            'vm.isLeftBottomEnabled',
            'vm.isLeftClosed',
        ], function() {
            // Go to the end of the digest cycle, when
            // Right aside css class has been set
            // Left aside css class has been set
            // We use two setTimeout, because just using $evalAsync provides
            // random results.
            // @warning random ui bug
            // The only way to fix I know this is to manage the reflow logic at
            // an upper level, and thus centralize the UI resizing
            // responsabilities from layout, splitpane and viewport in a single
            // source code.
            // This can be organically/easily done by stopping relying on
            // window resize events but only rely on angularjs $digest process
            // by setting the concrete viewports canvas size in an attribute
            // although it requires calculating it before without triggering
            // reflows (thus without relying on DOM methods to retrieve the
            // size).
            $scope.$evalAsync(function() {
                setTimeout(function() {
                    $scope.$apply(function() {
                        asap(function() {
                            $(window).trigger('resize');
                        });
                    });
                }, 50);
            });
        });
    }

})();
