var through = require('through2');
  gutil = require('gulp-util'),
  http = require('http'),
  https = require('https'),
  inject = require('connect-inject'),
  connect = require('connect'),
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

    app.use(inject({
      snippet: "<script type=\"text/javascript\" src=\"" + ioServerOrigin +"/socket.io.js\"></script>"
        + "<script type=\"text/javascript\">"
        + "console.log('Connecting to livereload server..." + ioServerOrigin + "');"
        + "var ___socket = io.connect('" + ioServerOrigin +"');"
        + "___socket.on('connect', function() { console.log('Successfully connected to livereload server'); });"
        + "___socket.on('connect_error', function(err) { console.log('Failed to connect to livereload server: ' + err); });"
        + "___socket.on('reload', function() { location.reload(); });"
        + "var ___console;"
        + "if (typeof console !== 'undefined') {"
        + "  ___console = console;"
        + "}"
        + "var console = {"
        + "  info: function() {"
        + "    ___socket.emit('console_info', arguments);"
        + "    try { if (___console.info) ___console.info.apply(null, arguments); } catch(e) {}"
        + "  },"
        + "  log: function() {"
        + "    ___socket.emit('console_log', arguments);"
        + "    try { if (___console.log) ___console.log.apply(null, arguments); } catch(e) {}"
        + "  },"
        + "  warn: function() {"
        + "    ___socket.emit('console_warn', arguments);"
        + "    try { if (___console.warn) ___console.warn.apply(null, arguments); } catch(e) {}"
        + "  },"
        + "  error: function() {"
        + "    ___socket.emit('console_error', arguments);"
        + "    try { if (___console.error) ___console.error.apply(null, arguments); } catch(e) {}"
        + "  }"
        + "};"
        + "</script>",
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
      (config.livereload.ioServer = http.Server().listen(config.livereload.port))
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
        gutil.log('Livereload: file changed: ' + filename);

        config.livereload.io.sockets.emit('reload');
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
