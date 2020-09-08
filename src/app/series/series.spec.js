/* jshint -W117, -W030 */
xdescribe('series', function() {
  describe('repository', function () {

    beforeEach(function() {
        bard.appModule('webviewer');
        
        bard.inject(this, '$controller', '$q', '$rootScope', '$timeout', '$httpBackend',
            'wvConfig', 'wvSeriesManager', 'wvOrthancSeriesAdapter', 'wvSeriesManager');

        _.forEach(orthanc.raw, function(data, path) {
          $httpBackend
            .when('GET', '/' + path)
            .respond(data);
        });
    });

    bard.verifyNoOutstandingHttpRequests();

    it('should return promises', function() {
      // given
      var orthancSeries = orthanc.seriesList.with2SingleFrameInstances;

      // when
      var series = wvSeriesManager.listFromOrthancSeriesId(orthancSeries.ID);

      // then
      expect(series.then).to.not.equal(undefined);

      $httpBackend.flush();
    });

    it('should work with orthanc multiframe instance', function(done) {
      // given a seriesList containing 2 multiframe instances
      var orthancStudy = orthanc.studies.withMultiFrameInstances; // 25 wv seriesList in that data sheet

      // when
      wvSeriesManager
      .listFromOrthancStudyId(orthancStudy.ID)
      .then(function(wvSeriesList) {

        // then
        expect(wvSeriesList.length).to.equal(2);
        done();

      });

      $httpBackend.flush();
    });

    it('should work with orthanc mono instance', function(done) {
      // given
      var orthancSeries = orthanc.seriesList.with2SingleFrameInstances;
      var orthancSortedInstances = orthanc.sortedInstances.with2SingleFrameInstances;

      // when
      wvSeriesManager
      .listFromOrthancSeriesId(orthancSeries.ID)
      .then(function(wvSeriesList) {

        // then
        var expectedResult = wvOrthancSeriesAdapter.process(orthancSeries, orthancSortedInstances);
        expect(wvSeriesList.length).to.equal(expectedResult.length);
        expect(wvSeriesList.id).to.equal(expectedResult.id);
        expect(wvSeriesList.tags).to.deep.equal(expectedResult.tags);
        expect(wvSeriesList.imageIds).to.deep.equal(expectedResult.imageIds);
        done();

      });

      $httpBackend.flush();
    });

  });
});
