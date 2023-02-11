const child_process = require('child_process');
const path = require('path');
const _ = require('lodash');
const Q = require('q');
const argv = require('yargs').argv;
const chalk = require('chalk');
const ports = require('./ports.js');

function OsiCommand(name, opts) {
	this.name = name;
	this.prefix = opts.prefix || this.name;
	this.path = opts.cwd;

	this.process = this._startCommand(opts.command, opts.args);
}

OsiCommand.prototype._startCommand = function(command, args) {
    console.log('--- Starting Server ' + this.name);

    var _this = this;

    var env = _.cloneDeep(process.env);

    args = args.map(function(arg) {
    	if (arg.match(/\$port/)) {
	    	return arg.replace('$port', ports.get())
    	}
    	else {
    		return arg;
    	}
    });

    var p = child_process.spawn(command, args, {
        cwd: _this.path,
        env: env,
        stdio: 'pipe'
    });

    p.on('error', function (err) {
        var prefix = chalk.bgRed.white(_this.prefix);
        var notice1 = prefix + ' Couldn\'t load server.';
        var notice2 = prefix + ' The path is probably wrong: ' + path.resolve(_this.path, command);
        console.log(chalk.bold(notice1));
        console.log(chalk.bold(notice2));

        // process.exit();
    });
    p.on('exit', function () {
        var prefix = chalk.bgRed.white(_this.prefix);
        var notice = prefix + ' closed...';
        console.error(notice);
    });

    var line = '';
    p.stderr.on('data', function (chunk) {
        chunk = chunk.toString();

        for (var i=0; i<chunk.length; ++i) {
        	var c = chunk[i];
        	line += c;
        	if (c === '\n') {
		        var prefix = chalk.bgRed.white(_this.prefix) + ' ';
		        line = prefix + line.replace(/\w+ \d\d:\d\d:\d\d.\d+\s+/, '');

		        process.stderr.write(line);

		        line = '';

        	}
        };

    });
    p.stdout.on('data', function (chunk){
        if (argv.verbose !== true && argv.verbose !== _this.prefix) return;

        chunk = chunk.toString();
        chunk = chunk.replace(/^\[.*\]\s*/, ''); // remove hours
        if (chunk.match(/^\s*$/)) return; // remove whitelines

        var prefix = chalk.bgCyan(_this.prefix);
        var notice = chunk;
        notice.split('\n').forEach(function(notice) {
            notice = notice.replace(/^\[.*\]\s*/, ''); // remove hours
            if (notice === '') return; // remove whiteline
            console.log(prefix + ' ' + notice);
        })
    });

    return p;
};

module.exports = OsiCommand;
