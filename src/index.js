"use strict";

var through = require('through2'),
  gutil = require('gulp-util'),
  http = require('http'),
  https = require('https'),
  inject = require('connect-inject'),
  connect = require('connect'),
  multiline = require('multiline'),
  watch = require('node-watch'),
  fs = require('fs'),
  serveIndex = require('serve-index'),
  serveStatic = require('serve-static'),
  path = require('path'),
  open = require('open'),
  enableMiddlewareShorthand = require('./enableMiddlewareShorthand'),
  socket = require('socket.io');


module.exports = function(options) {
  var defaults = {
    /**
     *
     * BASIC DEFAULTS
     *
     **/
    host: 'localhost',
    port: 8000,
    defaultFile: 'index.html',
    https: false,
    open: false,
    log: 'info',
    clientConsole: false,

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
      enable: false,
      port: 35729,
      filter: function(filename, cb) {
        cb( !(/node_modules/.test(filename)) );
      }
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
  var config = enableMiddlewareShorthand(defaults, options, ['directoryListing', 'livereload']);

  var openInBrowser = function () {
    if (config.open === false) return;
    open('http' + (config.https ? 's' : '') + '://' + config.host + ':' + config.port);
    openInBrowser = undefined;
  };

  // connect app
  var app = connect();

  //  directory listing
  if (config.directoryListing.enable) {
    app.use(serveIndex(path.resolve(config.directoryListing.path), config.directoryListing.options));
  }

  // socket.io
  if (config.livereload.enable) {
    var ioServerOrigin = 'http://' + config.host + ':' + config.livereload.port;

    // socket.io won't load if requirejs is already loaded unless I disable it first
    var snippet = multiline.stripIndent(function() {/*
      <script type="text/javascript">
        var __require, __define;
        if (typeof require !== 'undefined' && typeof requirejs !== 'undefined' && require === requirejs) {
          __require = require;
          __define = define;
          require = define = null;
        }

        (function() {
          var socketIoServer = document.location.protocol + '//' + document.location.hostname + ':<PORT>';

          var lr = document.createElement('script'); lr.type = 'text/javascript'; lr.async = true;
          lr.src = socketIoServer + '/socket.io.js';

          lr.onload = function() {
            if (__require) {
              require = __require;
              define = __define;
            }

            console.log('Connecting to livereload server...' + socketIoServer);
            
            var __socket = window.__socket = io.connect(socketIoServer);
            
            __socket.on('connect', function() {
              console.log('Successfully connected to livereload server');
            });

            __socket.on('connect_error', function(err) {
              console.log('Failed to connect to livereload server: ' + err);
            });

            __socket.on('reload', function() {
              location.reload();
            });
          };

          lr.onerror = function() {
            alert("Failed to load livereload script");
          };

          var s = document.getElementsByTagName('script')[0];
          s.parentNode.insertBefore(lr, s);
  
        })();
      </script>

    */}).replace('<PORT>', config.livereload.port);
   

    if (config.clientConsole) {
      snippet += multiline.stripIndent(function() {/*

        <script type="text/javascript">

          var __console;

          if (typeof console !== "undefined") {
            __console = console;
          }

          var console = window.console = {};

          (function(methods){
            var methods = ['info','log','error','warn'];
            for (var i in methods) {
              console[methods[i]] = (function(method){
                return function() {
                  var args = arguments, success;

                  try {
                    args = JSON.parse(JSON.stringify(args));
                    success = true;
                  } catch (e) {
                    ___console.error(e + ', console.' + method + ' will not be sent to livereload server', args);
                  }

                  try {
                    if (success) {
                      ___socket.emit('console_' + method, args);
                    }
                  } catch (e) {}

                  try {
                    if (__console[method]) {
                      __console[method].apply(null, arguments);
                    }
                  } catch (e) {
                    __console.error(e, arguments);
                  }
                };
              })(methods[i]);
            }
          })();

        </script>

      */});
    }

    app.use(inject({
      snippet: snippet,
      rules: [{
        match: /<\/body>/,
        fn: function(w, s) {
          return s + w;
        }
      }]
    }));

    var io = config.livereload.io = socket();
    io.serveClient(true);
    io.path("");
    io.on('connection', function(socket){
      gutil.log('Livereload client connected');
      
      socket.on('console_log', function(data){
        var args = [
          gutil.colors.green('log')
        ];
        for (var i in data) {
          args.push(data[i]);
        }
        gutil.log.apply(null, args);
      });
      socket.on('console_warn', function(data){
        var args = [
          gutil.colors.yellow('warn')
        ];
        for (var i in data) {
          args.push(data[i]);
        }
        gutil.log.apply(null, args);
      });
      socket.on('console_info', function(data){
        var args = [
          gutil.colors.cyan('info')
        ];
        for (var i in data) {
          args.push(data[i]);
        }
        gutil.log.apply(null, args);
      });
      socket.on('console_error', function(data){
        var args = [
          gutil.colors.red('err')
        ];
        for (var i in data) {
          args.push(data[i]);
        }
        gutil.log.apply(null, args);
      });
    });
    io.attach(
      (config.livereload.ioServer = http.createServer().listen(config.livereload.port, config.host))
    );
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

  // Create server
  var stream = through.obj(function(file, enc, callback) {
    if ('debug' === config.log) {
      app.use(function(req, res, next) {
        gutil.log(req.method + ' ' + req.url);

        next();
      });
    }


    app.use(serveStatic(file.path, {
      index: (config.directoryListing.enable ? false : config.defaultFile)
    }));

    if (config.livereload.enable) {
      watch(file.path, function(filename) {
        config.livereload.filter(filename, function(shouldReload) {
          if (shouldReload) {
            gutil.log('Livereload: file changed: ' + filename);
            config.livereload.io.sockets.emit('reload');
          }
        });
      });
    }

    this.push(file);

    callback();
  })
  .on('data', function() {
    // start the web server
    webserver.listen(config.port, config.host, openInBrowser);

    gutil.log('Webserver started at', gutil.colors.cyan('http' + (config.https ? 's' : '') + '://' + config.host + ':' + config.port));
  });


  // once stream killed
  stream.on('kill', function() {
    webserver.close();

    if (config.livereload.enable) {
      config.livereload.ioServer.close();
    }
  });

  return stream;
};
