describe('serieslist', function() {

    osi.beforeEach();
    osi.afterEach();

    beforeEach(function() {
        bard.inject('wvSeriesManager');

        osimis.HttpRequest.timeout = 20000; // limit requests to 20s (for better error feedback)
    });
    afterEach(function() {
        osimis.HttpRequest.timeout = 0; // reset HttpRequest timeouts
    });

    describe('directive', function() {

        // it('should display a list of DICOM multiframe instances as a list of series', function() {

        //     $scope.studyId = undefined;

        //     return osi
        //         .directive('<wv-serieslist wv-study-id="studyId" wv-on-study-loaded="checkShownSeries($error)"></wv-serieslist>')
        //         .then(function(directive) {
        //             // Use a promise to wrap the loaded callback
        //             return new Promise(function(resolve, reject) {
        //                 // Set the study id containing two DICOM multi frame instances
        //                 $scope.studyId = '595df1a1-74fe920a-4b9e3509-826f17a3-762a2dc3';

        //                 $scope.checkShownSeries = function(err) {
        //                     // Surround with try catch to convert assertion exception into promise rejection (and therefore let
        //                     // mocha process the error instead of just logging it and timing out) - perhaps required because
        //                     // AngularJS wrap the callback? 
        //                     try {
        //                         if (err) {
        //                             assert(false, JSON.stringify(err));
        //                         }
        //                         else {
        //                             // Two frontend series are displayed for two DICOM instance
        //                             // from one single DICOM series
        //                             assert.deepEqual(directive.$scope.vm.seriesIds, [
        //                                 '5d0d012e-4e2766cb-dd38b9ab-605538eb-ea8ac2cf:0',
        //                                 '5d0d012e-4e2766cb-dd38b9ab-605538eb-ea8ac2cf:1'
        //                             ]);
        //                             resolve();
        //                         }
        //                     }
        //                     catch(e) {
        //                         reject(e);
        //                     }
                            
        //                 };
        //                 $scope.$apply();
        //             });
        //         })
        //         ;

        // });

        // it('should display the list of series when unsupported series are present (eg. DICOM SR)', function() {

        //     $scope.studyId = undefined;

        //     return osi
        //         .directive('<wv-serieslist wv-study-id="studyId" wv-on-study-loaded="checkShownSeries($error)"></wv-serieslist>')
        //         .then(function(directive) {
        //             // Use a callback to wait till calls are made
        //             // Then check the desired series are found
        //             return new Promise(function(resolve, reject) {
        //                 // Set the study id containing both a DICOM SR series and a normal one
        //                 $scope.studyId = '3ff62993-28b67f81-6dfb132b-9d53983a-3a61f711';

        //                 $scope.checkShownSeries = function(err) {
        //                     // Surround with try catch to convert assertion exception into promise rejection (and therefore let
        //                     // mocha process the error instead of just logging it and timing out) - perhaps required because
        //                     // AngularJS wrap the callback?
        //                     try {
        //                         if (err) {
        //                             reject(err);
        //                             assert(false, JSON.stringify(err));
        //                         }
        //                         else {
        //                             assert.deepEqual(directive.$scope.vm.seriesIds, [
        //                                 '7410c2c9-784fdb9b-07b22740-612c386e-69ac4c8c:0'
        //                             ]);
        //                             resolve();
        //                         }
        //                     }
        //                     catch (e) {
        //                         reject(e);
        //                     }
        //                 };
                        
        //                 $scope.$apply();
        //             });
        //         })
        //         ;

        // });

    });

});
