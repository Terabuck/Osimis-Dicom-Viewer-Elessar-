// @responsibility: load master and slave gulp processes
//   and communicate between them

const OsiMaster = require('./osi-master.js');
const log = require('./log.js');
const ports = require('./ports.js');

//////// START

log('Starting osisync...');

ports
.load()
.then(function() {
	var master = new OsiMaster('./');

	////////// KILL SUB PROJECTS

	process.on('exit', function() {
	    log('Exiting osisync...');
	    master.exit();
	});
	// catch ctrl-c
	process.on('SIGINT', function() {
	    console.log();
	    log('Process Killed.');
	    process.exit();
	});
	// catch kill
	process.on('SIGTERM', function() {
	    process.exit();
	});
})

