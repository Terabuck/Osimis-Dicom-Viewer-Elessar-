(function(osimis) {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvKeyboardShortcut', keyboardShortcut);

    /* @ngInject */
    function keyboardShortcut($rootScope, wvKeyboardShortcutEventManager) {
        // the purpose of this directive is to create the wvKeyboardShortcutEventManager.  The wvWebViewer can not create it 
        // because of circular references
        
        var directive = {
            controller: Controller,
            link: link,
            restrict: 'A',
            scope: false,
            require: {
                webviewer: '?^wvWebviewer',
            }
        };
        return directive;

        function link(scope, element, attrs, ctrls) {
        }
    }

    /* @ngInject */
    function Controller(){
        
    }
})(osimis || (osimis = {}));