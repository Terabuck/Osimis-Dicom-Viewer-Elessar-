(function () {
    'use strict';

    /**
     * @ngdoc filter
     *
     * @name webviewer.filter:wvCapitalize
     *
     * @description
     * Used to uppercase the first letter of a string, or the first letter of a whole word.
     * Lower case all other letter except the one desired.
     *
     * If "all" is true then all words will have their first letter uppercased otherwise only the first word will be uppercased
     *
     */
    angular
        .module('webviewer')
        .filter('wvCapitalize', wvCapitalize);

    function wvCapitalize() {
        return wvCapitalizeFilter;

        ////////////////

        // snippet got http://codepen.io/WinterJoey/pen/sfFaK
        function wvCapitalizeFilter(input, all) {
          var reg = (all) ? /([^\d ]+[\S-]*) */g : /([^\d\s]+[\S-]*)/;
          return (!!input) ? input.replace(reg, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) : '';
        }
    }

})();
