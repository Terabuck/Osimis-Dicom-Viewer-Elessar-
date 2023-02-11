/*
 * Lib for OsiSync master integration to its gulp process.
 *
 */
const through = require('through2');
const PluginError = require('gulp-util').PluginError;
const path = require('path');
const _ = require('lodash');
const cheerio = require('cheerio');
const glob = require('glob');
const Q = require('q');

// @responsibility: replace dependencies' build file
//    with dependencies' dev files in index.html

var osisync_slaves = {};

// @resp load dependencies from mediator
function OsiMaster() {
    var self = this;

    // load dependencies
    process.on('message', function(data) {
        switch (data.type) {
        case 'osisync:AddSlave':
            self._processNewSlave(data.slave);
            break;
        }

        // @todo retrigger inject ! (w/ throttle)
    });

    this.slavesLoadedPromise = Q.Promise(function (resolve, reject) {
        process.on('message', function(data) {
            if (data.type !== 'osisync:SlavesLoaded') return;

            resolve();
        })
    });
}

// @responsibility send list of used ports to cli once everything (browsersync) is ready
OsiMaster.prototype.start = function(servicePorts) {
    process.send({
        type: 'osisync:MasterLoaded',
        ports: servicePorts
    });
};

OsiMaster.prototype._processNewSlave = function(slave) {
    slave.processedManifest = (function() {
        var devGlobs = slave.json.dev;
        var injectionByBuildFiles = slave.json.build;

        // gather slave dev files
        return _.mapValues(injectionByBuildFiles, function(injectTasks, buildFile) {
            return _.flatten(injectTasks.map(function (injectTaskName) {
                if (!devGlobs.hasOwnProperty(injectTaskName))
                    return [];
                else
                    return devGlobs[injectTaskName]
                    .map(function (glob) {
                        return path.resolve(slave.path, glob);
                    });
            }));
        });
    })();

    osisync_slaves[slave.name] = slave;
};

// @responsibility explode <scripts> build using slave informations
// @input .html with <script src=".../lib-ag3a5qe.js"> <link href=".../lib-hgqe32.css">
// @output .html with many <script src="localhost:4313/src/lib/madirective.js"> instead
OsiMaster.prototype.processHtml = function(htmlString) {
    var self = this;

    var $ = cheerio.load(htmlString);
    _.forEach(osisync_slaves, function (slave) {
        _.forEach(slave.processedManifest, function (devGlobs, buildedScript) {
            if (slave.revManifest) {
                buildedScript = slave.revManifest[buildedScript];
            }

            var ignoreGlobs = slave.json.ignore ? slave.json.ignore : [];

            switch (path.extname(buildedScript)) {
            case '.js':
                var buildedElement = $('script[src="/bower_components/'+slave.name+'/'+buildedScript+'"]');
                self._processDOMScript($, buildedElement, devGlobs, ignoreGlobs, slave);
            case '.css':
                var buildedElement = $('link[href="/bower_components/'+slave.name+'/'+buildedScript+'"]');
                self._processDOMLink($, buildedElement, devGlobs, ignoreGlobs, slave);
            }
        });
    });

    return $.html();
};

OsiMaster.prototype._processDOMScript = function($, buildedElement, devGlobs, ignoreGlobs, slave) {
    var paths = [];

    devGlobs.forEach(function (devGlob) {
        var devFiles = glob.sync(devGlob, {
            ignore: ignoreGlobs
        });
        devFiles = _.reverse(devFiles); // assure the elements are in right order

        devFiles.forEach(function (devFile) {
            paths.push(devFile);
        });
    });

    paths = _.uniq(paths); // make sure there is no duplicate entries

    var elems = [];

    paths
    .map(function(p) {
        p = path.relative(slave.path, p); // use relative path instead of absolute path
        p = 'http://' + slave.host + ':' + slave.port + '/' + p;
        return p;
    })
    .forEach(function(p) {
        var elem = $('<script></script>\n\t').attr("src", p);
        elems.push(elem);
    })
    
    buildedElement.replaceWith(elems);
};

OsiMaster.prototype._processDOMLink = function($, buildedElement, devGlobs, ignoreGlobs, slave) {

    var paths = [];

    devGlobs.forEach(function (devGlob) {
        var devFiles = glob.sync(devGlob, {
            ignore: ignoreGlobs
        });
        devFiles = _.reverse(devFiles); // assure the elements are in right order

        devFiles.forEach(function (devFile) {
            paths.push(devFile);
        });
    });

    paths = _.uniq(paths); // make sure there is no duplicate entries

    var elems = [];

    paths
    .map(function(p) {
        p = path.relative(slave.path, p); // use relative path instead of absolute path
        p = 'http://' + slave.host + ':' + slave.port + '/' + p;
        return p;
    })
    .forEach(function(p) {
        var elem = $('<link>\n\t')
            .attr('rel', 'stylesheet')
            .attr('href', p);
        elems.push(elem);
    })
    
    buildedElement.replaceWith(elems);
};

// @responsibility stream version of processHtml (gulp plugin)
OsiMaster.prototype.processHtmlStream = function() {
    var _this = this;
    var PLUGIN_NAME = 'osisync';

    return through.obj(function(file, encoding, callback) {
        if (!process.env.OSISYNC_MASTER || file.isNull()) {
            // nothing to do
            return callback(null, file);
        }

        if (file.isStream()) {
            // file.contents is a Stream - https://nodejs.org/api/stream.html
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams not supported!'));
            return;
        }

        if (!file.isBuffer()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Unknown stream type!'));
            return;
        }

        // wait all slaves to be loaded before injecting their stuffs
        _this.slavesLoadedPromise.then(function() {
            var htmlStr = _this.processHtml(file.contents.toString());
            file.contents = new Buffer(htmlStr);
            callback(null, file);
        });
    });
};


// @responibility browsersync listen to osisync index instead of // in
// if (process.env.OSISYNC_ENABLED) {
//     // use osisync index.html instead of the default one
//     options.files = [
//         '!' + config.client + 'index.html',
//         './.osisync/index.html'
//     ].concat(options.files);
// }



module.exports = OsiMaster;
