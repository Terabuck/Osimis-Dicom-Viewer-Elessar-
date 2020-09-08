/**
 * @ngdoc directive
 * @name webviewer.directive:wvVideo
 * 
 * @restrict E
 *
 * @param {string} wvVideoId
 * The id of the DICOM instance embedding the video.
 * 
 * @description
 * The `wvVideo` directive displays a MPEG-4 video embedded in a DICOM.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvVideo', wvVideo);

    /* @ngInject */
    function wvVideo(wvVideoManager) {
        var directive = {
            bindToController: true,
            require: 'wvVideo',
            controller: VideoVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            templateUrl: 'app/video/video.directive.html',
            scope: {
                videoId: '=wvVideoId'
            }
        };
        return directive;

        function link(scope, element, attrs, vm) {
            // Watch changes in user-defined videoId.
            scope.$watch('vm.videoId', function(newValue, oldValue) {
                // Discard video if instance id has been unset.
                if (oldValue && !newValue) {
                    vm.discardVideo();
                }
                // Load & update video if instance id has been set.
                else if (newValue) {
                    wvVideoManager
                        .get(newValue)
                        .then(function(video) {
                            vm.displayVideo(video);
                        });
                }
            });
        }
    }

    /* @ngInject */
    function VideoVM(wvVideoManager) {
        // Set default values
        this.video = undefined;
        this.videoType = 'video/mp4';

        // Hide video
        this.discardVideo = function() {
            this.video = undefined;
        }

        // Set & display the video
        this.displayVideo = function(video) {
            // Throw error if video is not mpeg4/mpeg4-bd.
            if (video.contentType.indexOf('video/mpeg4') !== 0) {
                throw new Error('Unsupported video contentType `' + video.contentType + '`.');
            }
            // Display video otherwise
            else {
                this.video = video;
                this.videoType = 'video/mp4'; // only supported format
            }
        }
    }
})();