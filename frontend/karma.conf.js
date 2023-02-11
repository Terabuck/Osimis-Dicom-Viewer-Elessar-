module.exports = function(config) {
var gulpConfig = require('./gulp.config')();
// var orthancUrl = process.env.ORTHANC_URL || 'http://localhost:8042';
// Add orthanc served config file
// gulpConfig.karma.files.push(orthancUrl + '/osimis-viewer/config.js')
// Capture console (only in dev mode)
gulpConfig.karma.client.captureConsole = true;
console.log(gulpConfig.karma.files);
config.set({
// base path that will be used to resolve all patterns (eg. files, exclude)
basePath: './',
// frameworks to use
// some available frameworks: https://npmjs.org/browse/keyword/karma-adapter
frameworks: ['mocha', 'chai', 'sinon', 'chai-sinon', 'mocha-webworker'],
// list of files / patterns to load in the browser
files: gulpConfig.karma.files,
// list of files to exclude
exclude: gulpConfig.karma.exclude,
client: gulpConfig.karma.client,
proxies: {
// // Add orthanc route
// '/instances/': orthancUrl + '/instances/',
// '/series/': orthancUrl + '/series/',
// '/studies/': orthancUrl + '/studies/',
// '/osimis-viewer/': orthancUrl + '/osimis-viewer/',
// Proxy for web worker to work with mocha
'/app/': '/base/src/app/',
'/bower_components/': '/base/bower_components/'
},
// preprocess matching files before serving them to the browser
// available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
preprocessors: gulpConfig.karma.preprocessors,
// test results reporter to use
// possible values: 'dots', 'progress', 'coverage'
// available reporters: https://npmjs.org/browse/keyword/karma-reporter
reporters: ['mocha'/*, 'coverage'*/],
mochaReporter: {
output: 'full',
showDiff: 'unified'
},
// log tests slower than 20ms
reportSlowerThan: 20,
// coverageReporter: {
// dir: gulpConfig.karma.coverage.dir,
// reporters: gulpConfig.karma.coverage.reporters
// },
// web server port
port: 9876,
// enable / disable colors in the output (reporters and logs)
colors: true,
// level of logging
// possible values: config.LOG_DISABLE || config.LOG_ERROR ||
// config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
logLevel: config.LOG_ERROR,
// enable / disable watching file and executing tests whenever any file changes
autoWatch: true,
// start these browsers
// available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
// browsers: ['Chrome', 'ChromeCanary', 'FirefoxAurora', 'Safari', 'PhantomJS'],
browsers: ['Chrome'],
// Continuous Integration mode
// if true, Karma captures browsers, runs the tests and exits
singleRun: false,
// fix phantomjs issue: http://stackoverflow.com/a/33802985/939741
// we reload phantomjs everytimes it fails up to 100 times...
captureTimeout: 60000,
browserDisconnectTimeout: 10000,
browserDisconnectTolerance: 5, // by default 0
// 30 sec to allow slow png compression processing
browserNoActivityTimeout: 60000 // by default 10000
});
};
