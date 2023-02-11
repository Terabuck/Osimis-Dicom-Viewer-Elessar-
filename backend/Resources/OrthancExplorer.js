$('#series').live('pagebeforecreate', function() {
  //$('#series-preview').parent().remove();

  var b = $('<a>')
    .attr('data-role', 'button')
    .attr('href', '#')
    .attr('data-icon', 'search')
    .attr('data-theme', 'e')
    .text('Osimis Web Viewer');

  b.insertBefore($('#series-delete').parent().parent());
  b.click(function() {
    if ($.mobile.pageData) {
      var urlSearchParams = {
        "series" : $.mobile.pageData.uuid
      };
      if ("authorizationTokens" in window) {
        for (var token in authorizationTokens) {
          urlSearchParams[token] = authorizationTokens[token];
        }
      }
  
      window.open('../osimis-viewer/app/index.html?' + $.param(urlSearchParams));
    }
  });
});

$('#study').live('pagebeforecreate', function() {
  //$('#series-preview').parent().remove();

  var b = $('<a>')
    .attr('data-role', 'button')
    .attr('href', '#')
    .attr('data-icon', 'search')
    .attr('data-theme', 'e')
    .text('Osimis Web Viewer');

  b.insertBefore($('#study-delete').parent().parent());
  b.click(function() {
    if ($.mobile.pageData) {

      var urlSearchParams = {
        "study" : $.mobile.pageData.uuid
      };
      if ("authorizationTokens" in window) {
        for (var token in authorizationTokens) {
          urlSearchParams[token] = authorizationTokens[token];
        }
      }

      window.open('../osimis-viewer/app/index.html?' + $.param(urlSearchParams));
    }
  });
});
