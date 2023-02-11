/**
 * @ngdoc service
 *
 * @name webviewer.service:wvAnnotationManager
 *
 * @description
 * Manager images' annotations.
 */
(function(osimis) {
    'use strict';

    function AnnotationManager(wvConfig) {
        var _this = this;

        // Hash: invariant is `_annotations[imageId][type] ===
        // AnnotationValueObject`.
        // This maps CornerstoneTools annotation model.
        this._annotations = {};

        // Store wvConfig by reference so we can pass headers each
        // time we make an http request.
        this._config = wvConfig;

        this.onAnnotationChanged = new osimis.Listener();

        // Disable annotation storage by default
        this._isAnnotationStorageEnabled = false;

        // Store loaded annotation studies so we can load annotations when
        // storage is enabled back.
        this._studyIdsOfLoadedAnnotations = [];

        // Retrieve annotations from the backend:
        // It's done each time the selected study change using the
        // `#loadStudyAnnotations` method.

        // Forward set annotations to the CornerstoneTools API:
        // It's done at the tool-level. See the `osimis.BaseTool` class for
        // more information.
    }

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     *
     * @name osimis.AnnotationManager#enableAnnotationStorage
     *
     * @description
     * Load annotations from the backend each time the study changes. If a
     * study as already been loaded, load its annotations right after the
     * method call.
     */
    AnnotationManager.prototype.enableAnnotationStorage = function() {
        // If annotation storage is already enabled, do nothing
        if (this._isAnnotationStorageEnabled) {
            return;
        }

        // Flag annotation storage as enabled
        this._isAnnotationStorageEnabled = true;

        // @todo Load all the annotations for the requested studies. Might be
        // required for lify, if the storage enabled setting is switched
        // between studies.
        // this._studyIdsOfLoadedAnnotations
        //     .forEach(function(studyId) {
        //         this.loadStudyAnnotations(studyId);
        //     });
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     *
     * @name osimis.AnnotationManager#disableAnnotationStorage
     *
     * @description
     * Stop loading annotations from the backend each time the study changes.
     */
    AnnotationManager.prototype.disableAnnotationStorage = function() {
        // If annotation storage is already disable, do nothing
        if (!this._isAnnotationStorageEnabled) {
            return;
        }

        // Flag annotation storage as disabled
        this._isAnnotationStorageEnabled = false;

        // @todo Unload all the annotations for studies in
        // `_requestedStudyIds`. We probably don't need to implement it with 
        // the current workflows.
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     *
     * @name osimis.AnnotationManager#onAnnotationChanged
     * 
     * @param {callback} callback
     * Called when an annotation has changed
     * 
     * Parameters:
     * * {osimis.AnnotationValueObject} `annotation` The modified annotation
     */
    AnnotationManager.prototype.onAnnotationChanged = function() { /* noop */ }; // see constructor

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     *
     * @name osimis.AnnotationManager#_storeAnnotationsInBackend
     *
     * @param {string} imageId
     * Id of the image where the annotations lies.
     * 
     * @param {string} type
     * Name of the tool concerned by the annotations.
     *
     * @param {object} data
     * The annotations stored in the CornerstoneTools annotation format.
     * 
     * @description
     * Store a debounced function to update the annotations in the backend,
     * this method is used in the `this.onAnnotationChanged` call above,
     * however, it can't be stored contextualy since any
     * onAnnotationChanged trigger would create a new debounce function,
     * thus in the end never triggering the same debounced function twice.
     */
    var delay = 250; // ms
    AnnotationManager.prototype._storeAnnotationsInBackend = _.debounce(function(imageId, type, data) {
        if (!this._isAnnotationStorageEnabled) {
            throw new Error('Annotation storage is disabled.');
        }

        var config = this._config;
        var annotations = this._annotations;

        var httpRequest = new osimis.HttpRequest();
        httpRequest.setCache(false);
        httpRequest.setHeaders(config.httpRequestHeaders);
        httpRequest.put(config.orthancApiURL + '/osimis-viewer/images/'+imageId.replace(':', '/')+'/annotations', {
            imageId: imageId,
            annotationsByTool: annotations[imageId]
        });
    }, delay);

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     *
     * @name osimis.AnnotationManager#set
     * 
     * @param {osimis.AnnotationValueObject} annotation
     * The annotation
     *
     * @param {boolean} [setByEndUser=false]
     * Set this variable when the annotations are set by the end users (by
     * clicking with the mouse on a canvas with a tool for instance) in
     * contrast to annotations retrieved from an external source. When set to
     * true, we know we have to store the annotation in the backend. When set
     * to false, we can avoid an useless request.
     * 
     * @description
     * Store the annotation in the model layer.
     */
    AnnotationManager.prototype.set = function(annotation, setByEndUser) {
        var annotations = this._annotations;
        setByEndUser = setByEndUser || false;

        // insert a uuid for those annotations that don't have it yet
        if (annotation && annotation.data && annotation.data.data) {
            for (var i in annotation.data.data) {
                if (annotation.data.data[i]["uuid"] === undefined) {
                    annotation.data.data[i]["uuid"] = UUIDjs.create(4).toString();
                }
            }
        }

        // As annotations are stateless, clone them to avoid unexpected
        // behavior
        annotation = _.cloneDeep(annotation);
        
        // Set annotations
        annotations[annotation.imageId] = annotations[annotation.imageId] || {};
        annotations[annotation.imageId][annotation.type] = annotation.data;

        // Delete annotations when empty
        if (!annotation.data || (typeof annotation.data.length !== 'undefined' && annotation.data.length === 0)) {
            delete annotations[annotation.imageId][annotation.type];
        }
        
        // Trigger annotation changed event
        this.onAnnotationChanged.trigger(annotation);

        // Post update to the backend once no changes have appear since the
        // last second, to avoid flooding the server and only updates when
        // the user has stopped doing interactions.
        if (this._isAnnotationStorageEnabled && setByEndUser) {
            this._storeAnnotationsInBackend(annotation.imageId, annotation.type, annotation.data);
        }
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     *
     * @name osimis.AnnotationManager#getAll
     * 
     * @return {object} All the annotations (as cornerstone annotations).
     *
     * @description
     * The `getAll` only intent is to provide backup of annotations for
     * storage. For instance LiveShare.
     */
    AnnotationManager.prototype.getAll = function() {
        var annotations = this._annotations;

        return _.cloneDeep(annotations);
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     * 
     * @name osimis.AnnotationManager#loadStudyAnnotations
     *
     * @param {string} studyId
     * Id of the study (in orthanc format) containing all the images' annotations.
     *
     * @description
     * Retrieve and cache set annotations based on a study id. Uses `#setAll`
     * method internally. Multiple calls to this method using the same studyId
     * attribute will only trigger one http call.
     *
     * @warning
     * This overrides all the currently defined annotation. It won't work
     * anymore when we'll implement the study comparison mechanism.
     */
    AnnotationManager.prototype.loadStudyAnnotations = function(studyId) {
        var _this = this;
        var config = this._config;

        // Retrieve all annotations for this study if annotation storage is
        // enabled
        if (this._isAnnotationStorageEnabled && 
            this._studyIdsOfLoadedAnnotations.indexOf(studyId) === -1
        ) {
            var httpRequest = new osimis.HttpRequest();
            httpRequest.setCache(false);
            httpRequest.setHeaders(config.httpRequestHeaders);

            httpRequest
                .get(config.orthancApiURL + '/osimis-viewer/studies/'+studyId+'/annotations')
                .then(function (response) {
                    if (response.data) {
                        _this.setAllStudyAnnotations(studyId, response.data);
                    }
                }, function (err) {
                    // Unflag study id if loading has failed
                    this._studyIdsOfLoadedAnnotations.splice(this._studyIdsOfLoadedAnnotations.indexOf(studyId), 1);

                    // Forward error
                    throw err;
                });

            // Flag the study's annotations as loaded to prevent duplicate
            // requests. Also, when annotation storage is enabled back, we can
            // use this stored id to retrieve the annotations at that moment.
            this._studyIdsOfLoadedAnnotations.push(studyId);
        }
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     *
     * @name osimis.AnnotationManager#setAllStudyAnnotations
     *
     * @param {string} studyId
     * The Orthanc Id of the study.
     * 
     * @param {object} annotationsOfStudy
     * All the annotations (as cornerstone annotations) for a single study.
     *
     * @description
     * Primary intent is to retrieve backup of annotations from storage. For
     * instance LiveShare.
     *
     * * @warning This does not remove annotations that no longer exists. We
     *   skip this as this method is only used at the study's loading for the
     *   moment.
     */
    AnnotationManager.prototype.setAllStudyAnnotations = function(studyId, annotationsOfStudy) {
        // Wrong param?
        // Update `this._annotations` & Trigger events.
        for (var imageId in annotationsOfStudy) {
            // Update annotaitons.
            this._annotations[imageId] = annotationsOfStudy[imageId];

            for (var type in this._annotations[imageId]) {
                // Recreate the annotation model based on the class.
                var data = this._annotations[imageId][type];
                var annotation = new osimis.AnnotationValueObject(type, imageId, data);

                // Trigger `onAnnotationChanged event.
                // @warning This won't trigger deletion events.
                this.onAnnotationChanged.trigger(annotation);
            }
        }
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     *
     * @name osimis.AnnotationManager#setAll
     * 
     * @param {object} annotations
     * All the annotations (as cornerstone annotations).
     *
     * @description
     * Primary intent is to retrieve backup of annotations from storage. For
     * instance LiveShare.
     */
    AnnotationManager.prototype.setAll = function(annotations) {
        // Update the annotations
        this._annotations = annotations; // No need for deep clone, we trust
                                         // method's users to not change the
                                         // object.

        // Trigger events
        for (var imageId in this._annotations) {
            if (this._annotations.hasOwnProperty(imageId)) {
                for (var type in this._annotations[imageId]) {
                    if (this._annotations[imageId].hasOwnProperty(type)) {
                        // Recreate the annotation model based on the class.
                        var data = this._annotations[imageId][type];
                        var annotation = new osimis.AnnotationValueObject(type, imageId, data);

                        // Trigger `onAnnotationChanged event
                        this.onAnnotationChanged.trigger(annotation);
                    }
                }
            }
        }
    };

    /**
     * @ngdoc method
     * @methodOf webviewer.service:wvAnnotationManager
     *
     * @name osimis.AnnotationManager#getByImageId
     * 
     * @param {string} imageId
     * The image id 
     * 
     * @param {string} [type] 
     *    If set, either one of those value:
     *    * The annotation type
     *    * The related cornestone tool's name
     *    If undefined, all the available annotations will be returned.
     * 
     * @return {Array<osimis.AnnotationValueObject>}
     * The list of annotation returned
     */
    AnnotationManager.prototype.getByImageId = function(imageId, type) {
        // As annotations are stateless, we clone them to avoid unexpected
        // behavior. We may want to undo this to gain performance (by only
        // watching annotations' internal object ids instead of relying on
        // deep watch). This also permits to map `annotations` without changing
        // the `this._annotations` later in this function.
        var annotations = _.cloneDeep(this._annotations);

        // Return filtered annotations (by type).
        if (type) {
            var data = annotations[imageId] && annotations[imageId][type];
            return annotations[imageId] && annotations[imageId][type] && new osimis.AnnotationValueObject(type, imageId, data) || [];
        }
        // Return all annotations.
        else {
            return _(annotations[imageId])
                .map(function(data, type) {
                    return new osimis.AnnotationValueObject(type, imageId, data) || [];
                })
                .cloneDeep() || [];
        }
    };

    osimis.AnnotationManager = AnnotationManager;

    // Inject in angular
    
    angular
        .module('webviewer')
        .factory('wvAnnotationManager', wvAnnotationManager);

    /* @ngInject */
    function wvAnnotationManager(wvConfig) {
        return new AnnotationManager(wvConfig);
    }
})(this.osimis || (this.osimis = {}));