/**
 * @ngdoc directive
 * @name webviewer.directive:wvNotice
 *
 * @param {string} wvContent
 * The textual content shown in the notice
 *
 * @param {callback} wvOnClose
 * An event triggered when the end-user closes the notice. Once the user has
 * closed the notice once, the choice is saved in a cookie. Thus, this callback
 * is also called at the directive initialization each time the notice is
 * displayed, but the cookie has already been set / the notice has already been
 * closed once. This is therefore important to rely on the `ngIf` directive to 
 * hide/show the notice. The `ngShow` won't trigger the callback, and this
 * callback is used to hide the bottom zone. Therefore, using `ngShow`, the
 * notice won't be shown, but the bottom zone still will (although empty).
 * 
 * @scope
 * @restrict E
 *
 * @description
 * The `wvNotice` directive displays a notice and provide a close button. When
 * closed, a cookie prevent the notice from being displayed ever again.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvNotice', wvNotice);

    /* @ngInject */
    function wvNotice() {
        var directive = {
            bindToController: true,
            controller: NoticeVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                content: '=?wvContent',
                onClosed: '&?wvOnClose'
            },
            templateUrl: 'app/utilities/notice.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
        }
    }

    /* @ngInject */
    function NoticeVM($cookies) {
        var _this = this;

        // When close button is clicked on by the user
        this.close = function() {
            // Always skip the notice from now on.
            //_this.skip = true;
            //$cookies.put('skipNotice', _this.skip);

            // Trigger onClose callback
            this.onClosed();
        };

        // Close the notice at start if we've registered that choice in a
        // cookie. This is done that way since the callback closes the bottom
        // zone as well, but it's not up to the notice to directly control
        // that. Thus, we use a callback instead.
        //this.skip = ($cookies.get('skipNotice') == 'true') || false;
        //if (this.skip) {
        //    this.close();
        // }
    }
})();