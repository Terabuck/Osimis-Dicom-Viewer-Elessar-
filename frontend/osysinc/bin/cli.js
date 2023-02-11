#!/usr/bin/env node

var argv = require('yargs')
	.usage('osisync <command>')
	.command('start')
	// @todo --verbose=prefix
	.argv;

var command = argv._[0] || 'start';

switch (command) {
case 'start': 
	require('../cli/cli.js');
break;
default:
	console.log('wrong command');
}

// console.log(command);
// console.log(argv);


// console.log(osisync.hello);
