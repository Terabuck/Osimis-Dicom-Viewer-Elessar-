function _convertDate(date) {
    if (date === undefined || date.length == 0) {
        return undefined;
    }
    var year = date.replace(/^([0-9]{4})([0-9]{2})([0-9]{2})$/, '$1');
    var month = date.replace(/^([0-9]{4})([0-9]{2})([0-9]{2})$/, '$2');
    var day = date.replace(/^([0-9]{4})([0-9]{2})([0-9]{2})$/, '$3');

    var f = __webViewerConfig.dateFormat;
    var d = f.replace("YYYY", year).replace("MM", month).replace("DD", day);

    return d;
}
