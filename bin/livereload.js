#!/usr/bin/env node

var server = require('../src/index.js');
var fs = require('vinyl-fs');

var opts = {};

var program = require('commander');

program
	.version('1.2.4')
	.option('-n, --no-browser', 'Do not open in a Browser')
	.option('-l, --log [type]', 'Log level (default: info)', 'info')
	.option('-p, --port <n>', 'The port to run on', parseInt)
	.parse(process.argv);

if (program.log)
	opts.log = program.log;
if (program.noBrowser)
	opts.open = false;
if (program.port)
	opts.port = program.port;
if (program.host)
	opts.host = program.host;

opts.livereload = {
  enable: true
};

fs.src('.').pipe(server(opts));
