(function(root) {
    "use strict";

    _.assign(root, {
        inject: inject,
        beforeEach: beforeEach,
        afterEach: afterEach,
        directive: directive,
        controller: controller
    });

    function inject() {
        bard.inject('$compile', '$q', '$timeout', '$rootScope', '$timeout', 'cornerstone');
    }

    function afterEach() {
        window.afterEach(function() {
            $scope.$destroy();
            $rootScope.$destroy();
            $('body').children().remove();

            cornerstone.imageCache.purgeCache();
        });
    }

    function beforeEach() {
        window.beforeEach(function() {
            bard.asyncModule('webviewer', 
                function($exceptionHandlerProvider) {
                    $exceptionHandlerProvider.mode('rethrow');
                },
                function ($compileProvider) {
                    $compileProvider.debugInfoEnabled(true);
                }
            );

            inject();

            // for console live debugging purpose
            window.test = this.currentTest;

            window.$scope = window.$rootScope.$new();
        });
    }

    // see https://docs.angularjs.org/api/ng/function/angular.element for available methods
    function directive(html, ctrlName) { // ctrlName is optional, used to select the ctrlName of an attribute instead of the element
        var domElement = $(html);
        ctrlName = ctrlName || domElement.prop('tagName').toLowerCase();

        // @note element must appended to body to retrieve its size
        $('body').append(domElement);

        var element = $compile(domElement)(window.$scope);

        window.$rootScope.$digest();

        return new Promise(function(resolve, reject) {
            // Force a setTimeout after the $digest (somehow due to AngularJS testing intricaties when bardjs
            // is used in async mode, even if $digest should be synchronous anyway)
            // Note $q don't trigger setTimeout like most promise systems do because it relies on $digest cycle instead.
            // Therefore, we have to manually call the timeout.
            setTimeout(function() {
                // Add helpers
                element.$controller = controller(element, ctrlName);
                element.$scope = element.isolateScope() || element.scope();

                resolve(element);
            });
        });
    }

    function controller(element, name) {
        var child = element.find('[' + name + ']');
        var selector = !child.length ? element : child;

        var ctrl = name
            .split('-')
            .map(function(token, index) {
                if (index === 0) {
                    return token.toLowerCase()
                }
                else {
                    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
                }
            })
            .join('');

        return selector.controller(ctrl);
    }

})(window.osi || (window.osi = {}));