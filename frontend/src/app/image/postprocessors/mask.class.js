(function() {
    'use strict';

    angular
        .module('webviewer')
        .factory('WvMask', WvMask);

    /* @ngInject */
    function WvMask() {
    	
    	function Mask() {

    	}

    	return Mask;
    }
})();