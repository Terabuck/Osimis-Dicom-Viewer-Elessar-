/*
 * Lib for OsiSync slave integration to its gulp process.
 *
 * The slave's gulpfile has to contain a gulp task named osisync.
 * This task has to update preprocessed files when needed,
 * and to start a server providing both the preprocessed content (eg. the template & css files)
 * and the unprocessed content (eg. the js files).
 * The task will be called by the OsiSync CLI.
 *
 * Once the server has started, the method OsiSlave#start has to be called with 
 * the server informations (the ip & port).
 * These informations will be transmitted to the OsiSync CLI.
 */
function OsiSlave() {

}

OsiSlave.prototype.start = function(opts) {
	process.send({
		type: 'osisync:SlaveStarted',
		host: opts.host,
		port: opts.port
	});
}

module.exports = OsiSlave;