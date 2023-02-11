const child_process = require('child_process');
const path = require('path');
const _ = require('lodash');
const Q = require('q');
const argv = require('yargs').argv;
const chalk = require('chalk');

const log = require('./log.js');
const OsiSlave = require('./osi-slave.js');
const OsiCommand = require('./osi-command.js');
const ports = require('./ports.js');

const GULP_PATH = 'node_modules/gulp/bin/gulp.js';

function OsiMaster(cwd) {
    var _this = this;

    this.path = path.resolve(cwd || './');

    this.json = require(path.resolve(this.path, 'osisync.json'));
    this.json.slaves = this.json.slaves || [];
    
    this.bower = require(path.resolve(this.path, 'bower.json'));
    this.name = this.json.name || path.basename(cwd);
    this.prefix = this.json.prefix || path.basename(cwd);

    this.process = this._startGulp();
    this.slaves = [];
    this.commands = [];

    this.json.slaves.forEach(function (cwd) {
        _this._addSlave(path.resolve(_this.path, cwd));
    });

    _.forEach(this.json.commands, function (opts, name) {
        var server = new OsiCommand(name, opts);
        _this.commands.push(server);
    });

    this.slavesLoadedPromise = Q.all(this.slaves.map(function(slave) {
        return slave.loadedPromise;
    }));

    this.masterLoadedPromise = Q.Promise(function(resolve) {
        _this.process.on('message', function(data) {
            if (data.type !== 'osisync:MasterLoaded') return;

            _this.ports = data.ports;
            resolve(_this.ports);
        });
    });

    this.slavesLoadedPromise.then(function() {
        _this.process.send({
            type: 'osisync:SlavesLoaded'
        });
    });

    this.masterLoadedPromise.then(function(ports) {
        _.forEach(ports, function(port, service) {
            service = service.replace('Port', '');

            var prefix = chalk.white.bgBlue(_this.prefix);
            var notice = prefix + ' http://localhost:' + port + '/ -> ' + service;
            if (service === 'browserSync') {
                notice = chalk.bold(notice);
            }
            console.log(notice);
        });
    });
}

OsiMaster.prototype.exit = function() {
    this.process.kill();
    this.slaves.forEach(function (s) {
        s.process.kill();
    });
    this.commands.forEach(function (c) {
        c.process.kill();
    });
};

OsiMaster.prototype._addSlave = function(path) {
    var _this = this;
    var slave = new OsiSlave(path);

    // override bower mains
    if (_this.bower.overrides && _this.bower.overrides.hasOwnProperty(slave.name)) {
        var slave_overrides = _this.bower.overrides[slave.name];

        if (slave_overrides.main) {
            slave.bower.main = slave_overrides.main;
        }
    }

    slave.loadedPromise.then(function() {
        _this.process.send({
            type: 'osisync:AddSlave',
            slave: _.omit(slave, ['process']) 
        });
    });

    _this.slaves.push(slave);
}

OsiMaster.prototype._startGulp = function() {
    log('Starting Gulp Master ' + this.name);

    var _this = this;

    var env = _.cloneDeep(process.env);
    env.OSISYNC_ACTIVE = true;
    env.OSISYNC_MASTER = true;
    env.OSISYNC_PORTS = ports.get(10);

    // @note: fork does not clone the current process like posix fork
    var p = child_process.fork(path.resolve(_this.path, GULP_PATH), [
        'serve-dev'
    ], {
        cwd: _this.path,
        env: env,
        silent: true
    });

    p.on('error', function (err) {
        var prefix = chalk.bgRed.white(_this.prefix);
        var notice1 = prefix + ' Couldn\'t load master.';
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

        var prefix = chalk.blue(_this.prefix);
        var notice = chunk;
        notice.split('\n').forEach(function(notice) {
            notice = notice.replace(/^\[.*\]\s*/, ''); // remove hours
            if (notice === '') return; // remove whiteline
            console.log(prefix + ' ' + notice);
        })
    });

    return p;
};

module.exports = OsiMaster;
