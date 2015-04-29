#!/usr/bin/env node

var server = require('../src/index.js');
var fs = require('vinyl-fs');

var opts = {
	port: process.env.PORT,
	open: true,
	logLevel: 2
};

for (var i = process.argv.length-1; i >= 2; --i) {
	var arg = process.argv[i];
	if (arg.indexOf('--port=') > -1) {
		var portString = arg.substring(7);
		var portNumber = parseInt(portString, 10);
		if (portNumber === portString) {
			opts.port = portNumber;
			process.argv.splice(i, 1);
		}
	}
	else if (arg.indexOf('--open=') > -1) {
		var path = arg.substring(7);
		if (path.indexOf('/') !== 0) {
			path = '/' + path;
		}
		opts.open = path;
		process.argv.splice(i, 1);
	}
	else if (arg === '--no-browser') {
		opts.open = false;
		process.argv.splice(i, 1);
	} else if (arg === '--quiet' || arg === '-q') {
		opts.logLevel = 0;
		process.argv.splice(i, 1);
	} else if (arg === '--help' || arg === '-h') {
		console.log('Usage: livereload [-h|--help] [-q|--quiet] ' +
			'[--port=PORT] [--open=PATH] [--no-browser] [PATH]');
		process.exit();
	}
}

fs.src('.').pipe(server(opts));
