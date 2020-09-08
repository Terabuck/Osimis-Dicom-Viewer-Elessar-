/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.AnnotationGroup
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .factory('WvAnnotationGroup', factory);

    /* @ngInject */
    function factory() {

        // @note This is stateless
        // @note This collection can be used for filtering and accessing a group of annotations
        function WvAnnotationGroup(annotations) {
            annotations = _.flatten(annotations);
            this._annotations = annotations || [];
        }
        
        ////////////////

        /**
         * @return Array
         */
        WvAnnotationGroup.prototype.toArray = function() {
            return this._annotations;
        };

        /**
         * @param type: string
         * @return WvAnnotationGroup
         */
        WvAnnotationGroup.prototype.filterByType = function(type) {
            var annotations = this._annotations
                .filter(function(annotation) {
                    return annotation.type === type;
                });

            return new WvAnnotationGroup(annotations);
        };

        /**
         * @param type: string
         * @return WvAnnotationGroup
         */
        WvAnnotationGroup.prototype.filterByImageId = function(imageId) {
            var annotations = this._annotations
                .filter(function(annotation) {
                    return annotation.imageId === imageId;
                });

            return new WvAnnotationGroup(annotations);
        };

        /**
         * @return Array
         */
        WvAnnotationGroup.prototype.getImageIds = function() {
            return this._annotations
                .reduce(function(result, annotation) {
                    var imageId = annotation.imageId;
                    
                    if (result.indexOf(imageId) === -1) {
                        result.push(imageId);
                    }

                    return result;
                }, []);
        };

        /**
         * @return Array
         */
        WvAnnotationGroup.prototype.getTypes = function() {
            return this._annotations
                .reduce(function(result, annotation) {
                    var type = annotation.type;
                    
                    if (result.indexOf(type) === -1) {
                        result.push(type);
                    }

                    return result;
                }, []);
        };

        /**
         * @param fn function(WvAnnotationGroup, imageId)
         * @return Array
         */
        WvAnnotationGroup.prototype.mapByImageIds = function(fn) {
            // group by imageId
            var annotationsByImageId = this._annotations
                .reduce(function(result, nextAnnotation) {
                    var imageId = nextAnnotation.imageId;

                    if (!result.hasOwnProperty(imageId)) {
                        result[imageId] = [];
                    }
                    
                    result[imageId].push(nextAnnotation);

                    return result;
                }, {});

            // convert annotation arrays into WvAnnotationGroup
            var annotationGroupsByImageId = _(annotationsByImageId)
                .mapValues(function(annotations) {
                    return new WvAnnotationGroup(annotations);
                })
                .value();

            // map
            return _(annotationGroupsByImageId).map(fn).value();
        };


        /**
         * @return boolean
         */
         WvAnnotationGroup.prototype.hasType = function(type) {
            return this._annotations
                .reduce(function(result, nextAnnotation) {
                    return result || nextAnnotation.type === type;
                }, false);
         };

        return WvAnnotationGroup;
    }
})();