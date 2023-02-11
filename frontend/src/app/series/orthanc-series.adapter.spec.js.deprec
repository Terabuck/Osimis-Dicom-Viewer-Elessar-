/* jshint -W117, -W030 */
xdescribe('series', function() {

  describe('orthanc-series-adapter', function () {
    beforeEach(function() {
        bard.appModule('webviewer');
        
        bard.inject(this, '$controller', '$q', '$rootScope', '$timeout', '$httpBackend',
            'wvOrthancSeriesAdapter', 'WvSeries');
    });

    bard.verifyNoOutstandingHttpRequests();

    it('should convert an orthanc series to a wv series [singleframe]', function() {
        // load a series with single frame instances
        var ortSeries = orthanc.seriesList.with2SingleFrameInstances;
        var ortSortedInstances = orthanc.sortedInstances.with2SingleFrameInstances

        // convert it to our model
        var seriesList = wvOrthancSeriesAdapter.process(ortSeries, ortSortedInstances);

        expect(seriesList.length).to.equal(1);
        expect(seriesList[0]).to.be.an.instanceof(WvSeries);
        expect(seriesList[0].id).to.equal(ortSeries.ID + ':0');

        // check there is 2 images in the series
        expect(seriesList[0].imageIds.length).to.equal(2);

        // check that the first instance of our series model is the first instance of the orthanc series
        expect(seriesList[0].imageIds[0]).to.equal(ortSortedInstances.SlicesShort[0][0] + ':0');
    });

    it('should convert an orthanc series to a wv series [multiframe]', function() {
      // given
      var ortSeries = orthanc.seriesList.with2MultiFrameInstances;
      var ortSortedInstances = orthanc.sortedInstances.with2MultiFrameInstances;

      // when
      var seriesList = wvOrthancSeriesAdapter.process(ortSeries, ortSortedInstances);

      // then
      expect(seriesList.length).to.equal(2);
      
      // check that the first instance of the first series is the first instance of the orthanc series
      expect(seriesList[0].imageIds[0]).to.equal(ortSortedInstances.SlicesShort[0][0] + ':0');
    });
  });

});
