/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.Video
 *
 * @description
 * A model of a video. It contains the URL where the video is located, and the
 * tags of the DICOM instance embedding it.
 *
 * Since `<video>` HTML elements primarily requires an URL to display content,
 * the url of the raw video data is also provided.
 */
(function(osimis) {
    'use strict';

    /**
     * @constructor osimis.Video
     */
    function Video(config, instanceId, tags, contentType) {
        /**
         * @ngdoc property
         * @propertyOf osimis.Video
         *
         * @name osimis.Video#id
         * 
         * @type {string}
         * 
         * @description 
         * The id of the video. It equals the DICOM instance embedding it.
         */
        this.id = instanceId;

        /**
         * @ngdoc property
         * @propertyOf osimis.Video
         *
         * @name osimis.Video#tags
         * 
         * @type {object}
         * 
         * @description 
         * An hashmap of the tags of the DICOM instance embedding the video.
         */
        this.tags = tags;

        /**
         * @ngdoc property
         * @propertyOf osimis.Video
         *
         * @name osimis.Video#contentType
         * 
         * @type {string}
         * 
         * @description 
         * The type of the video. Can either be,
         * 
         * * `video/mpeg2`
         * * `video/mpeg4`
         * * `video/mpeg4-bd`
         */
        this.contentType = contentType;

        /**
         * @ngdoc property
         * @propertyOf osimis.Video
         *
         * @name osimis.Video#url
         * 
         * @type {string}
         * 
         * @description 
         * The full URL where the video is located.
         */
        this.url = config.orthancApiURL + '/instances/' + this.id + '/frames/0/raw';
    }

    osimis.Video = Video;

})(this.osimis || (this.osimis = {}));