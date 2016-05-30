"use strict";

var _ = require('lodash'),
  through = require('through2'),
  gutil = require('gulp-util'),
  http = require('http'),
  https = require('https'),
  inject = require('connect-inject'),
  connect = require('connect'),
  proxy = require('proxy-middleware'),
  watch = require('node-watch'),
  fs = require('fs'),
  serveIndex = require('serve-index'),
  serveStatic = require('serve-static'),
  path = require('path'),
  open = require('open'),
  enableMiddlewareShorthand = require('./enableMiddlewareShorthand'),
  socket = require('socket.io'),
  url = require('url'),
  extend = require('node.extend');


var BROWSER_SCIPTS_DIR = path.join(__dirname, 'browser-scripts');




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
    fallback: null,
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
      markupHost: null,
      port: 35729,
      filter: function(filename, cb) {
        cb( !(/node_modules/.test(filename)) );
      },
      clientConsole: false,
    },

    // Middleware: Directory listing
    // For possible options, see:
    //  https://github.com/expressjs/serve-index
    directoryListing: {
      enable: false,
      path: './',
      options: undefined
    },

    // Middleware: Proxy
    // For possible options, see:
    //  https://github.com/andrewrk/connect-proxy
    proxies: []

  };

  // Deep extend user provided options over the all of the defaults
  // Allow shorthand syntax, using the enable property as a flag
  var config = enableMiddlewareShorthand(defaults, options, ['directoryListing', 'livereload']);

  var httpsOptions = {
    key: fs.readFileSync(config.https.key || __dirname + '/../ssl/dev-key.pem'),
    cert: fs.readFileSync(config.https.cert || __dirname + '/../ssl/dev-cert.pem')
  };

  var openInBrowser = function () {
    if (config.open === false) return;
    open('http' + (config.https ? 's' : '') + '://' + config.host + ':' + config.port);
    openInBrowser = undefined;
  };

  // connect app
  var app = connect();
  // Proxy requests
  for (var i = 0, len = config.proxies.length; i < len; i++) {
    var proxyoptions = url.parse(config.proxies[i].target);
    if (config.proxies[i].hasOwnProperty('options')) {
      extend(proxyoptions, config.proxies[i].options);
    }

    proxyoptions.route = config.proxies[i].source;
    app.use(proxy(proxyoptions));

    gutil.log(config.proxies[i].source + ' is proxied.');
  }
  //  directory listing
  if (config.directoryListing.enable) {
    app.use(serveIndex(path.resolve(config.directoryListing.path), config.directoryListing.options));
  }

  // socket.io
  if (config.livereload.enable) {
    var snippetParams = [];

    if (config.livereload.clientConsole) {
      snippetParams.push("extra=capture-console");
    }

    // If it wasn't provided, use the server host:
    var markupHost = !!_.get(config.livereload.markupHost, 'length')
      ? "'" + config.livereload.markupHost + "'"
      : null;

    var snippet =
      "<script type=\"text/javascript\">"
      + "var _lrscript = document.createElement('script');"
      + "_lrscript.type = 'text/javascript';"
      + "_lrscript.defer = _lrscript.async = true;"
      + "_lrscript.src = '//' + ((" + markupHost + "||location.host).split(':')[0]) + ':"+config.livereload.port+"/livereload.js?"+snippetParams.join('&')+"';"
      + "document.body.appendChild(_lrscript);"
      + "</script>";

    var prepend = function(w, s) {
      return s + w;
    };

    var append = function(w, s) {
      return w + s;
    }

    app.use(inject({
      snippet: snippet,
      rules: [{
        match: /<\/body>/,
        fn: prepend
      }, {
        match: /<\/html>/,
        fn: prepend
      }, {
        match: /<\!DOCTYPE.+>/,
        fn: append
      }]
    }));

    var io = config.livereload.io = socket();
    io.serveClient(true);
    io.path("");
    io.on('connection', function(socket){
      gutil.log('Livereload client connected');

      socket.on('console', function(params){
        var method = params.method,
          data = params.data,
          color = gutil.colors.green(method);

        switch (method) {
          case 'error':
            color = gutil.colors.red('error');
            break;
          case 'warn':
            color = gutil.colors.yellow('warn');
            break;
          case 'info':
            color = gutil.colors.cyan('info');
            break;
          case 'debug':
          case 'trace':
            color = gutil.colors.blue('debug');
            break;
        }
        var args = [color];

        for (var i in data) {
          args.push(data[i]);
        }

        gutil.log.apply(null, args);
      });
    });

    var ioApp = connect();

    ioApp.use(serveStatic(BROWSER_SCIPTS_DIR, { index: false }));

    var ioServerBase = config.https 
      ? https.createServer(httpsOptions, ioApp)
      : http.createServer(ioApp);

    var ioServer = config.livereload.ioServer =
      ioServerBase.listen(config.livereload.port, config.host);

    io.attach(ioServer, {
      path: '/socket.io'
    });

    gutil.log('Livereload started at', gutil.colors.gray('http' + (config.https ? 's' : '') + '://' + config.host + ':' + config.livereload.port));
  }

  // http server
  var webserver = null;
  if (config.https) {
    webserver = https.createServer(httpsOptions, app);
  }
  else {
    webserver = http.createServer(app);
  }

  var files = [];

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
            // Treat changes to sourcemaps as changes to the original files.
            filename = filename.replace(/\.map$/, '');

            config.livereload.io.sockets.emit('file_changed', {
              path: filename,
              name: path.basename(filename),
              ext: path.extname(filename),
            });
          }
        });
      });
    }

    this.push(file);

    callback();
  })
  .on('data', function(f) {
    files.push(f);

    // start the web server
    webserver.listen(config.port, config.host, openInBrowser);

    gutil.log('Webserver started at', gutil.colors.cyan('http' + (config.https ? 's' : '') + '://' + config.host + ':' + config.port));
  })
  .on('end', function(){
    if (config.fallback) {
      files.forEach(function(file){
        var fallbackFile = file.path + '/' + config.fallback;
        if (fs.existsSync(fallbackFile)) {
          app.use(function(req, res) {
            res.setHeader('Content-Type', 'text/html; charset=UTF-8');
            fs.createReadStream(fallbackFile).pipe(res);
          });
        }
      });
    }
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
