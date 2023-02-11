/*jshint node:true*/
// This server purpose is for development only, in production, the frontend is
// served by the C++ Plugin: see `backend/` folder.
'use strict';
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var logger = require('morgan');
var osisync = require('osisync');
var httpProxy = require('http-proxy');
var port = process.env.PORT || 5554;
var environment = process.env.NODE_ENV;
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(logger('dev'));
console.log('About to crank up node');
console.log('PORT=' + port);
console.log('NODE_ENV=' + environment);
function wait(seconds){
/**
* Needed to test with latency in dev
*/
var waitTill = new Date(new Date().getTime() + seconds * 1000);
while(waitTill > new Date()){}
}
// setting proxies
var orthancProxy = httpProxy.createProxyServer();
var orthancUrl = 'http://localhost:8042';
// avoid crash on request cancel
orthancProxy.on('error', function (err, req, res) {
console.log('crash avoided?');
});
app.all('/config.js', function(req, res, next) {
// Prefix config.js with osimis-viewer/. The proxy has lost the "osimis-
// viewer" because it's the relative path `../config.js` -> `/../config.js`
// -> `/config.js`
req.url = '/osimis-viewer/' + req.url;
next();
});
app.all('/osimis-viewer/languages/*', function(req, res, next){
var splittedUrl = req.url.split('/osimis-viewer/languages/');
console.log('trying to get language', req.url, splittedUrl);
req.url = '/languages/' + splittedUrl[1] + ".json";
wait(2);
next()
});
app.all("/:service/*", function(req, res, next) {
var toRedirectToOrthanc = [
'osimis-viewer',
'studies',
'instances',
'series',
'tools'
];
// Keep serving
if (toRedirectToOrthanc.indexOf(req.params.service) === -1) {
next();
}
// Redirect to orthanc
else {
console.log('redirecting ' + req.url + ' to Orthanc server ' + orthancUrl);
// There's a problem when handling post requests, replace the
// bodyParser middleware as in https://github.com/nodejitsu/node-http-
// proxy/issues/180 and handle manually the body parsing
req.removeAllListeners('data');
req.removeAllListeners('end');
process.nextTick(function () {
if(req.body) {
if(req.header("Content-Type") == "application/x-www-form-urlencoded"){
req.emit('data', serializedIntoFormData(req.body));
}else{
req.emit('data', JSON.stringify(req.body));
}
}
req.emit('end');
});
orthancProxy.web(req, res, {target: orthancUrl});
}
});
switch (environment){
case 'build':
console.log('** BUILD **');
app.use(express.static('./build/'));
// Any invalid calls for templateUrls are under app/* and should return
// 404
app.use('/app/*', function(req, res, next) {
// @todo 404
// four0four.send404(req, res);
});
// Any deep link calls should return index.html
// app.use('/*', express.static('./build/index.html'));
break;
default:
console.log('** DEV **');
if (osisync.master) {
// overload the index.html with the osisync-master injected one
app.use(express.static('./.osisync/'));
}
app.use(express.static('./.tmp'));
app.use(express.static('./src/'));
app.use(express.static('./'));
// Any invalid calls for templateUrls are under app/* and should return
// 404
app.use('/app/*', function(req, res, next) {
// @todo 404
// four0four.send404(req, res);
});
// Any deep link calls should return index.html
// app.use('/*', express.static('./.tmp/index.html'));
break;
}
app.listen(port, function() {
console.log('Express server listening on port ' + port);
console.log('env = ' + app.get('env') +
'\n__dirname = ' + __dirname +
'\nprocess.cwd = ' + process.cwd());
});
