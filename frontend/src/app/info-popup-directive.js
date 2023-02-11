/**
 * @ngdoc directive
 * @name webviewer.directive:wvInfoPopup
 *
 * @scope
 * @restrict E
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvInfoPopup', wvInfoPopup);

    /* @ngInject */
    function wvInfoPopup(wvConfig) {
        var directive = {
            bindToController: true,
            controller: InfoPopupVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                show: '=?wvShow',
                isStartup: '=?wvIsStartup'
            },
            templateUrl: 'app/info-popup-directive.html'
        };
        return directive;

        function link(scope, element, attrs) {

            if (scope.vm.closePopupAtStartup && scope.vm.isStartup) {
                scope.vm.close();
            }
        }
    }

    /* @ngInject */
    function InfoPopupVM($cookies, wvConfig) {
        var _this = this;
        this.viewerVersion = wvConfig.version.webviewer;
        this.orthancVersion = wvConfig.version.orthanc;
        this.showDocumentation = (wvConfig.config.documentationUrl !== undefined) && (wvConfig.config.documentationUrl.length > 0);
        this.documentationUrl = wvConfig.config.documentationUrl;

        // When close button is clicked on by the user
        this.close = function() {
            var expiration = new Date();
            expiration.setTime(expiration.getTime() + 10 * 365 * 24 * 3600 * 1000); // 10 years from now
            $cookies.put('showInfoPopupAtStartupUserPref', _this.showInfoPopupAtStartupUserPref, {'expires': expiration});
            _this.show = false;
        };

        if (wvConfig.config.showInfoPopupAtStartup == "never") {
            this.showCheckbox = false;
            this.closePopupAtStartup = true;
        } else if (wvConfig.config.showInfoPopupAtStartup == "always") {
            this.showCheckbox = false;
            this.closePopupAtStartup = false;
        } else {
            this.showCheckbox = true;
            if ($cookies.get('showInfoPopupAtStartupUserPref') === undefined)
            {
                this.showInfoPopupAtStartupUserPref = true;
                this.closePopupAtStartup = false;
            } else {
                this.showInfoPopupAtStartupUserPref = ($cookies.get('showInfoPopupAtStartupUserPref') == 'true')
                this.closePopupAtStartup = !this.showInfoPopupAtStartupUserPref;
            }
        }
    }
})();
