describe('webviewer', function() {
    
    osi.beforeEach();
    osi.afterEach();

    describe('directive', function() {

        describe('webviewer#series-id attribute', function() {

            // This is no longer relevant.
            xit('should be used to initialize viewports', function() {
                // Instantiate & test directive with the series-id attribute
                return osi.directive(
                    '<wv-webviewer wv-series-id="seriesId"></wv-webviewer>'
                )
                .then(function(directive) {
                    /* After directive initialization (to enforce strong asynchronous design) */

                    // Set seriesId
                    $scope.seriesId = 'baba';

                    $scope.$digest();

                    return directive;
                })
                .then(function(directive) {
                    // Test directive
                    var vm = directive.$scope.vm;

                    // Check one viewport has been configured
                    assert.equal(vm.viewports.length, 1);

                    // Check seriesId has been applied to every viewports
                    vm.viewports.forEach(function(viewport) {
                        assert.equal(viewport.seriesId, 'baba');
                    });

                });

            });

        });

        
    });

});