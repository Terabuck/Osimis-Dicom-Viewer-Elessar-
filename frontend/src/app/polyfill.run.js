(function () {
    'use strict';

    angular
        .module('webviewer')
        .run(function() {
			Math.log2 = Math.log2 || function(x){return Math.log(x)*Math.LOG2E;};        	
        });
})();