var through = require('through2');
var gutil = require('gulp-util');
var http = require('http');
var https = require('https');
var connect = require('connect');
var serveStatic = require('serve-static');
var watch = require('node-watch');
var fs = require('fs');
var serveIndex = require('serve-index');
var path = require('path');
var open = require('open');
var enableMiddlewareShorthand = require('./enableMiddlewareShorthand');
var socket = require('socket.io');


module.exports = function(options) {
  var defaults = {
    /**
     *
     * BASIC DEFAULTS
     *
     **/
    host: 'localhost',
    port: 8000,
    fallback: false,
    https: false,
    open: false,

    /**
     *
     * MIDDLEWARE DEFAULTS
     *
     * NOTE:
     *  All middleware should defaults should have the 'enable'
     *  property if you want to support shorthand syntax like:
     *
     *    webserver({
     *      livereload: true
     *    });
     *
     */

    // Middleware: Livereload
    livereload: {
      enable:false
    },

    // Middleware: Directory listing
    // For possible options, see:
    //  https://github.com/expressjs/serve-index
    directoryListing: {
      enable: false,
      path: './',
      options: undefined
    }
  };

  // Deep extend user provided options over the all of the defaults
  // Allow shorthand syntax, using the enable property as a flag
  var config = enableMiddlewareShorthand(defaults, options, ['directoryListing','livereload']);

  var openInBrowser = function () {
    if (config.open === false) return;
    open('http' + (config.https ? 's' : '') + '://' + config.host + ':' + config.port);
  };

  // connect app
  var app = connect()

  //  directory listing
  if (config.directoryListing.enable) {
      app.use(serveIndex(path.resolve(config.directoryListing.path), config.directoryListing.options));
  }

  // http server
  var webserver = null;
  if (config.https) {
    var options = {
      key: fs.readFileSync(config.https.key || __dirname + '/../ssl/dev-key.pem'),
      cert: fs.readFileSync(config.https.cert || __dirname + '/../ssl/dev-cert.pem')
    };

    webserver = https.createServer(options, app);
  }
  else {
    webserver = http.createServer(app);
  }

  // socket.io
  var io = null;
  if (config.livereload.enable) {
    io = require('socket.io').listen(webserver);

    // TODO: inject client JS
  }

  // Create server
  var stream = through.obj(function(file, enc, callback) {
    app.use(serveStatic(file.path));

    if (config.fallback) {
      var fallbackFile = file.path + '/' + config.fallback;

      if (fs.existsSync(fallbackFile)) {
        app.use(function(req, res) {
          fs.createReadStream(fallbackFile).pipe(res);
        });
      }
    }

    if (config.livereload.enable) {
      watch(file.path, function(filename) {
        if (io) {
          io.sockets.emit('reload');
        }
      });
    }

    this.push(file);

    callback();
  });


  // once stream killed
  stream.on('kill', function() {
    webserver.close();

    if (config.livereload.enable) {
      lrServer.close();
    }
  });

  // start the web server
  webserver.listen(config.port, config.host, openInBrowser);

  gutil.log('Webserver started at', gutil.colors.cyan('http' + (config.https ? 's' : '') + '://' + config.host + ':' + config.port));

  return stream;
};
