module.exports = function(config) {
    var cwd = '../../frontend/';
    var gulpConfig = require(cwd+'gulp.config')();

    var orthancUrl = process.env.ORTHANC_URL || 'http://localhost:8042';

    // Add orthanc served config file
    // Must not put orthancUrl content, would trigger CORS error. Mocha proxies 
    // `/osimis-viewer/` route instead.
    gulpConfig.karma.files.push('http://localhost:9876/osimis-viewer/config.js')

    // Add integration tests
    gulpConfig.karma.files.push('../tests/**/*.spec.js')

    config.set({
        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: cwd,

        // frameworks to use
        // some available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai', 'sinon', 'chai-sinon', 'mocha-webworker'],

        // list of files / patterns to load in the browser
        files: gulpConfig.karma.files,

        // list of files to exclude
        exclude: gulpConfig.karma.exclude,

        client: gulpConfig.karma.client,

        proxies: {
            // Add orthanc route
            '/instances/': orthancUrl + '/instances/',
            '/series/': orthancUrl + '/series/',
            '/studies/': orthancUrl + '/studies/',
            '/osimis-viewer/': orthancUrl + '/osimis-viewer/',
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
        //     dir: gulpConfig.karma.coverage.dir,
        //     reporters: gulpConfig.karma.coverage.reporters
        // },

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR ||
        // config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_DEBUG,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        //        browsers: ['Chrome', 'ChromeCanary', 'FirefoxAurora', 'Safari', 'PhantomJS', 'Firefox', 'SlimerJS'],
        browsers: ['Docker_Chrome'],

        // Add custom chrome flag for work within docker (specifically with fake window server Xvfb)
        customLaunchers: {
          Docker_Chrome: {
            base: 'Chrome',
            // see http://stackoverflow.com/questions/33820098/headless-chrome-in-docker-using-xvfb
            flags: ['--no-sandbox', '--disable-gpu', '--single-process'] // with sandbox it fails under Docker
          }
        },


        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,

        // fix phantomjs issue: http://stackoverflow.com/a/33802985/939741
        // we reload phantomjs everytimes it fails up to 100 times...
        captureTimeout: 120000,
        browserDisconnectTimeout: 10000,
        browserDisconnectTolerance: 5, // by default 0
        // 30 sec to allow slow png compression processing
        browserNoActivityTimeout: 120000 // by default 10000
    });
};
