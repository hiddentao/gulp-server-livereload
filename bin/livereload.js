#!/usr/bin/env node

var server = require('../src/index.js');
var fs = require('vinyl-fs');

var opts = {
	port: process.env.PORT,
	open: true,
	logLevel: 2
};

var program = require('commander');

program
  .version('1.2.4')
  .option('-n, --no-browser', 'No Browser')
  .option('-l, --log [type]', 'Log level [info]', 'info')
  .option('-p, --port <n>', 'The port to run on', parseInt)
  .parse(process.argv);

opts.logLevel = program.log;
if (program.noBrowser)
	opts.open = false;
if (program.port)
	opts.port = program.port;

fs.src('.').pipe(server(opts));
