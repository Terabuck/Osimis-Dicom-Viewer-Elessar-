/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.AnnotationValueObject
 */
(function(osimis) {
    'use strict';

    /** new osimis.AnnotationValueObject(type, imageId, data)
     *
     * @ValueObject
     *
     * @note can contains *one or multiple annotation*:
     *   Cornerstone can have multiple annotations in one data object.
     *   For interoperability reasons, we keep it that way.
     */
    function AnnotationValueObject(type, imageId, data) {
        this.type = type;
        this.imageId = imageId;
        this.data = data;

        if (!type) {
            throw new Error('Annotation must have a type!');
        }
    }

    osimis.AnnotationValueObject = AnnotationValueObject;

    // Inject in angular
    
    angular
        .module('webviewer')
        .factory('WvAnnotationValueObject', factory);

    /* @ngInject */
    function factory() {
        
        ////////////////

        return osimis.AnnotationValueObject;
    }
})(this.osimis || (this.osimis = {}));