(function() {
    'use strict';
    angular
    .module('webviewer')
    .run(function() {

        // hide loading screen once angular app is ready
        $(".wvLoadingScreen").remove();
    });

})();