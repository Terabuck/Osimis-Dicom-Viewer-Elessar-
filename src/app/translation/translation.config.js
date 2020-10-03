(function(){
    var translation = angular
        .module('webviewer'); // .translation
    translation.config(translateConfig);

    /* @ngInject */
    function translateConfig($translateProvider, wvConfigProvider) {
        /**
         * Set the translate config, and the async loader
         * note that the async loader makes test failed if it needs to get the translation during
         * its execution
         * To prevent this we cannot set default languages and fallback,
         * so we set a fake language that has not translations and that is loaded synchronously.
         *
         * So in that case fallback language are deactivated and no real languages are set by default.
         * The app needs to specifically use $translate.use('en' | 'fr') in it's index or entrypoint.
         */
        // because wvConfig is not available for config step, we need to inject it manually see: http://stackoverflow.com/questions/15358029/why-am-i-unable-to-inject-angular-cookies
        var wvConfig = wvConfigProvider._config;
        var languages = {
            en: 'english',
            fr: 'français',
            nl: 'nederlands',
            pt: 'português',
            es: 'español',
            jp: 'japanese',
            gr: 'german',
            it: 'italian',
            zh: 'chinese'
        };
        // languages Key array, automatically populated set with languages object
        var keysArray = [];
        for (var key in languages){
            if(languages.hasOwnProperty(key)){
                keysArray.push(key);
            }
        }

        $translateProvider.translations('xx', {});
        // load json static files instead of writing them directly in the js
        // located on the server at /languages/en.json for exemple.
        $translateProvider.useStaticFilesLoader({
            prefix: wvConfig.orthancApiURL + '/osimis-viewer/languages/',
            suffix: ""
        });

        // storage json into local storage (optimization)
        // $translateProvider.useLocalStorage();

        // default language
        $translateProvider.preferredLanguage('xx');  // for test

        // make correspond different local code to our language code fr_FR to fr for exemple.
        // http://angular-translate.github.io/docs/#/guide/09_language-negotiation
        // Looks like if we don't set an object, in second argument the correspondance is automatically made
        $translateProvider.registerAvailableLanguageKeys(keysArray, {"*": "en"});

        // Enable escaping of HTML
        // see http://angular-translate.github.io/docs/#/guide/19_security
        $translateProvider.useSanitizeValueStrategy('escapeParameters');

        // use a fallback language
        // $translateProvider.fallbackLanguage('en'); commented to prevent async call during test. No fallback language provided.

        // console.log('language has been set', $translateProvider)
    }
})();
