/**
 * OsiSync is a command-line tool aiming to synchronise multiple gulp development workflow together,
 * so you can edit files from a remote library and watch changes instantaneously.
 *
 * OsiSync as 2 parts, the command-line tool, and the node library.
 * This file contains the library part of osisync.
 * 
 * When osisync is launched via commandline, it launches multiple gulp processes.
 * These gulp processes need to communicate with their parent process (the cli).
 * They especially 
 * 
 * As such, it should beused in gulpfiles / node server launcher (the server.js file in the yeoman generator-osimis-angular).
 */

var OsiMaster = require('./master.js');
var OsiSlave = require('./slave.js');

/*
 * Gather available ports from osisync cli.
 *
 * In case osisync is not used, we want to be able to use the osisync#getPort() function anyway,
 * this is why the default port range [5555; 5565] is provided.
 *
 * @note
 * The available-port gathering process could have been done within this library instead to avoid to provide a default port range.
 * I made the choice not to do this to avoid race conditions between the different gathering.
 */
var _ports = process.env.OSISYNC_PORTS ? process.env.OSISYNC_PORTS.split(',') : [5556, 5557, 5558, 5559, 5560, 5561, 5562, 5563, 5564, 5565];
var _nextPortIndex = 0;

module.exports = {
	getPort: function() {
		return _ports[_nextPortIndex++];
	},
	master: process.env.OSISYNC_MASTER && new OsiMaster(),
	slave: process.env.OSISYNC_SLAVE && new OsiSlave()
};