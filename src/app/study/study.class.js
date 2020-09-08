/**
 * @ngdoc object
 * @memberOf osimis
 *
 * @name osimis.Study
 *
 * @description
 * The `Study` model represent a DICOM study.
 */
(function(osimis) {
    'use strict';

    function Study(Promise, studyManager, seriesManager, id, tags, seriesIds, pdfInstanceIds, videoIds) {
        // Injections.
        this._Promise = Promise;
        this._studyManager = studyManager;
        this._seriesManager = seriesManager

        // constructor
        this.series = seriesIds; // @todo remove, use seriesIds instead
        this.videoIds = videoIds;
        this.reportIds = pdfInstanceIds;
        this.seriesIds = seriesIds;

        // Default values.
        this.id = id;
        this.tags = tags;
        this.hasBeenViewed = false;


        /**
         * @type {string}
         *
         * * gray
         * * blue
         * * red
         * * green
         * * yellow
         * * violet
         */
        this.color = 'gray';

        // Format dates in dicom tags.
        // @todo let that stuff to the view or move in external method.
        this.tags.StudyDate = this.tags.StudyDate && _convertDate(this.tags.StudyDate);
        this.tags.PatientBirthDate = this.tags.PatientBirthDate && _convertDate(this.tags.PatientBirthDate);
    }

    /**
     * @ngdoc method
     * @methodOf osimis.Study
     *
     * @name osimis.Study#getRelatedStudies
     *
     * @return {Promise<Array<osimis.Study>>}
     * The list of the related study ids, including the ones set as
     * input.
     *
     * @description
     * Retrieve the list of all study ids related to this one. This is done by
     * checking the patient of this study, and returning all the studies of
     * that patient.
     */
    Study.prototype.getRelatedStudies = function() {
        var Promise = this._Promise;
        var studyManager = this._studyManager;

        return studyManager
            // Get related study ids.
            .getRelatedStudyIds(this.id)
            // Convert related study ids to study models.
            .then(function (studyIds) {
                var studyPromises = studyIds
                    .map(function (studyId) {
                        return studyManager.get(studyId);
                    });

                return Promise.all(studyPromises);
            });
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Study
     *
     * @name osimis.Study#setHasBeenViewed
     *
     * @param {boolean} hasBeenViewed
     * The value to set.
     *
     * @description
     * Define wether the study has already been viewed by the end-user or not.
     * The attribute is intended to be used to toggle a
     */
    Study.prototype.setHasBeenViewed = function(hasBeenViewed) {
        this.hasBeenViewed = hasBeenViewed;
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Study
     *
     * @name osimis.Study#setColor
     *
     * @param {string} [color='gray']
     * The color to set. Can be one of these values:
     *
     * * gray
     * * blue
     * * red
     * * green
     * * yellow
     * * violet
     *
     * @description
     * Define the study color. This method is mostly used to differentiate
     * studies from each others.
     */
    Study.prototype.setColor = function(color) {
        this.color = color || 'gray';
    };

    /**
     * @ngdoc method
     * @methodOf osimis.Study
     *
     * @name osimis.Study#hasColor
     *
     * @return {boolean}
     * Return true when the color is not the default one (gray).
     *
     * @description
     * Method used to know if a study already has a default color.
     */
    Study.prototype.hasColor = function() {
        return this.color !== 'gray';
    };


    /**
     * Get the next itemId with the type of the item next to it.
     *
     * The ordering is make by type of the item
     * series > video > report
     *
     * @param itemId
     * the item id or undefined. If it is undefined, it will return the first item found following the function logic.
     *
     * @return Array[nextItemId, nextItemType<"series"|"video"|"report">]
     */
    Study.prototype.getNextItemId = function(itemId){
        var currentItemType,
            nextItemType,
            _itemId,
            _nextIndex;
        if(itemId){
            if(this.seriesIds.indexOf(itemId) > -1){
                currentItemType = "series";
                _nextIndex = this.seriesIds.indexOf(itemId) + 1;
                if(_nextIndex >= this.seriesIds.length){
                    nextItemType = "video";
                    _nextIndex = 0;
                }else{
                    nextItemType = "series";
                }
            }else if(this.videoIds.indexOf(itemId) > -1){
                currentItemType = "video";
                _nextIndex = this.videoIds.indexOf(itemId) + 1;
                if(_nextIndex >= this.videoIds.length){
                    nextItemType = "report";
                    _nextIndex = 0;
                }else{
                    nextItemType = "video";
                }
            }else if(this.reportIds.indexOf(itemId) > -1){
                currentItemType = "report";
                _nextIndex = this.reportIds.indexOf(itemId) + 1;
                if(_nextIndex >= this.reportIds.length){
                    nextItemType = "series";
                    _nextIndex = 0;
                }else{
                    nextItemType = "report";
                }
            }else{
                throw new Error("This itemId is not found in the study");
            }
        }else{
            nextItemType = "series";
            _nextIndex = 0;
        }

        while(!_itemId){
            if(nextItemType === "series"){
                if(_nextIndex < this.seriesIds.length){
                    _itemId = this.seriesIds[_nextIndex];
                }else{
                    _nextIndex = 0;
                    nextItemType = "video";
                }
            }else if(nextItemType === "video"){
                if(_nextIndex < this.videoIds.length){
                    _itemId = this.videoIds[_nextIndex];
                }else{
                    _nextIndex = 0;
                    nextItemType = "report";
                }
            } else if(nextItemType === "report"){
                if(_nextIndex < this.reportIds.length){
                    _itemId = this.reportIds[_nextIndex];
                }else{
                    _nextIndex = 0;
                    nextItemType = "series";
                }
            } else {
                throw new Error("Unexpected itemType");
            }
        }

        return [_itemId, nextItemType]

    };

    /**
     * Get the previoud itemId with the type of the item next to it.
     *
     * The ordering is make by type of the item
     * series > video > report
     *
     * @param itemId
     * the item id or undefined. If it is undefined, it will return the first item found following the function logic.
     *
     * @return Array[previousItemId, previousItemType<"series"|"video"|"report">]
     */
    Study.prototype.getPreviousItemId = function(itemId){
        var currentItemType,
            previousItemType,
            _itemId,
            _previousIndex;

        if(itemId){
            if(this.seriesIds.indexOf(itemId) > -1){
                currentItemType = "series";
                _previousIndex = this.seriesIds.indexOf(itemId) - 1
                if(_previousIndex < 0){
                    previousItemType = "video";
                    _previousIndex = 0;
                }else{
                    previousItemType = "series";
                }
            }else if(this.videoIds.indexOf(itemId) > -1){
                currentItemType = "video";
                _previousIndex = this.videoIds.indexOf(itemId) - 1
                if(_previousIndex < 0){
                    previousItemType = "report";
                    _previousIndex = 0;
                }else{
                    previousItemType = "video";
                }
            }else if(this.reportIds.indexOf(itemId) > -1){
                currentItemType = "report";
                _previousIndex = this.reportIds.indexOf(itemId) - 1
                if(_previousIndex < 0){
                    previousItemType = "series";
                    _previousIndex = 0;
                }else{
                    previousItemType = "report";
                }
            }else{
                throw new Error("This itemId is not found in the study");
            }
        }else{
            previousItemType = "series";
            _previousIndex = 0;
        }

        while(!_itemId){
            if(previousItemType === "series"){
                if(_previousIndex < this.seriesIds.length && _previousIndex >= 0){
                    _itemId = this.seriesIds[_previousIndex];
                }else{
                    _previousIndex = this.videoIds.length - 1;
                    previousItemType = "video";
                }
            }else if(previousItemType === "video"){
                if(_previousIndex < this.videoIds.length && _previousIndex >= 0){
                    _itemId = this.videoIds[_previousIndex];
                }else{
                    _previousIndex = this.reportIds.length - 1;
                    previousItemType = "report";
                }
            } else if(previousItemType === "report"){
                if(_previousIndex < this.reportIds.length && _previousIndex >= 0){
                    _itemId = this.reportIds[_previousIndex];
                }else{
                    _previousIndex = this.seriesIds.length - 1;
                    previousItemType = "series";
                }
            } else {
                throw new Error("Unexpected itemType");
            }
        }

        return [_itemId, previousItemType]

    };

    osimis.Study = Study;

})(this.osimis || (this.osimis = {}));
