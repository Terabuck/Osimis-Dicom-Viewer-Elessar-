const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const Q = require('q');
const argv = require('yargs').argv;
const chalk = require('chalk');

const log = require('./log.js');
const ports = require('./ports.js');

const GULP_PATH = 'node_modules/gulp/bin/gulp.js';

function OsiSlave(path_) {
    var _this = this;

    this.path = path.resolve(path_);

    var osiPath = path.resolve(this.path, 'osisync.json');
    if (!fs.existsSync(osiPath)) {
        console.error('!!! Unfound osisync.json');
        return;
    }
    this.json = require(osiPath);

    this.name = this.json.name || path.basename(path_);
    this.prefix = this.json.prefix || path.basename(path_);

    this.process = this._startGulp();

    this.loadedPromise = Q.Promise(function (resolve) {
        // @todo close listener
        _this.process.on('message', function(data) {
            if (data.type !== 'osisync:SlaveStarted') return;
            _this.host = data.host;
            _this.port = data.port;
            resolve(_this);
        });
    });

    // use the build bowerfile !
    this.bower = require(path.resolve('bower_components/', this.name, 'bower.json'));

    var revManifestPath = path.resolve('bower_components/', this.name, 'rev-manifest.json');
    if (fs.existsSync(revManifestPath)) {
        this.revManifest = require(revManifestPath);
    }

    this.manifest = this.json.manifest;
    this.dev = this.json.dev;
    this.build = this.json.build;

    this.loadedPromise.then(function(slave) {
        var prefix = chalk.white.bgMagenta(_this.prefix);
        var notice = prefix + ' http://' + slave.host + ':' + slave.port + '/ -> server';
        console.log(chalk.italic(notice));
    });

}

OsiSlave.prototype._startGulp = function() {
    log('Starting Gulp Slave ' + this.name);

    var _this = this;

    var env = _.cloneDeep(process.env);
    env.OSISYNC_ACTIVE = true;
    env.OSISYNC_SLAVE = true;
    env.OSISYNC_PORTS = ports.get(10);

    // @note: fork does not clone the current process like posix fork
    var p = child_process.fork(path.resolve(_this.path, GULP_PATH), [
        'osisync', '--novet'
    ], {
        cwd: _this.path,
        env: env,
        silent: true
    });

    p.on('error', function (err) {
        var prefix = chalk.bgRed.white(_this.prefix);
        var notice1 = prefix + ' Couldn\'t load slave.';
        var notice2 = prefix + ' The path is probably wrong: ' + _this.path;
        console.error(chalk.bold(notice1));
        console.error(chalk.bold(notice2));

        // process.exit();
    });
    p.on('exit', function () {
        var prefix = chalk.bgRed.white(_this.prefix);
        var notice = prefix + ' closed...';
        console.error(notice);
    });
    p.stderr.on('data', function (chunk) {
        chunk = chunk.toString();
        if (chunk.match(/^\s*$/)) return; // remove whitelines

        var prefix = chalk.bgRed.white(_this.prefix);
        var notice = chunk;
        notice.split('\n').forEach(function(notice) {
            if (notice === '') return; // remove whiteline
            console.log(prefix + ' ' + notice);
        })
    });
    p.stdout.on('data', function (chunk){
        if (argv.verbose !== true && argv.verbose !== _this.prefix) return;

        chunk = chunk.toString();
        chunk = chunk.replace(/^\[.*\]\s*/, ''); // remove hours
        if (chunk.match(/^\s*$/)) return; // remove whitelines

        var prefix = chalk.magenta(_this.prefix);
        var notice = chunk;
        notice.split('\n').forEach(function(notice) {
            notice = notice.replace(/^\[.*\]\s*/, ''); // remove hours
            if (notice === '') return; // remove whiteline
            console.log(prefix + ' ' + notice);
        })
    });

    return p;
};

module.exports = OsiSlave;
