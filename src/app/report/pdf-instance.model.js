/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.PdfInstance
 *
 * @description
 * The `PdfInstance` model represents a DICOM instance embedding a PDF
 * file. Orthanc DICOM series are splitted in webviewer series & PDF instances 
 * within the `series/orthanc-series.adapter.js` file. We creates pdf instances 
 * at the series level to avoid having to send multiple HTTP requests (for
 * performance reason).
 */
(function(osimis) {
    'use strict';

    function PdfInstance(pdfInstanceManager, instanceId, instanceTags) {
        var _this = this;

        this.id = instanceId; // orthanc instance id
        this.tags = instanceTags;

        this._pdfInstanceManager = pdfInstanceManager;
    };

    osimis.PdfInstance = PdfInstance;

})(this.osimis || (this.osimis = {}));