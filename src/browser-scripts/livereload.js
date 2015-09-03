(function() {
  var __require, __define;
  if (typeof require !== 'undefined' && typeof requirejs !== 'undefined' && require === requirejs) {
    __require = require;
    __define = define;
    require = define = null;
  }


  var __getLastTagOfType = function(tagName) {
    var tags = document.getElementsByTagName(tagName);

    return tags[tags.length - 1];
  };


  var __addUrlQueryParam = function(href, key, val) {
    if (0 > href.indexOf('?')) {
      href += '?';
    } else {
      var pos = href.indexOf(key);

      if (0 < pos) {
        href = href.substr(0, pos);
      }
    }

    var lastChar = href.charAt(href.length-1);
    if ('?' !== lastChar && '&' !== lastChar) {
      href += '&';
    } 
    
    href += key + '=' + val;

    return href;
  };


  if (!window._onLiveReloadFileChanged) {
    window._onLiveReloadFileChanged = function(file) {
      if (!file) {
        return;
      }

      // CSS changed?
      if ('.css' === file.ext) {
        var linkTags = document.getElementsByTagName('link');

        for (var i=0; i<linkTags.length; ++i) {
          (function(linkTag) {
            if ('stylesheet' == linkTag.rel && 0 <= linkTag.href.indexOf(file.name)) {
              var href = linkTag.getAttribute('href');

              console.log('Re-loading CSS: ' + href);

              href = __addUrlQueryParam(href, '_lf', Date.now());

              // overwrite original (forces browser to reload it)
              linkTag.setAttribute('href', href);    
            }
          })(linkTags[i]);
        }
      }
      // other stuff changed
      else {
        // disable "confirm reload" dialogs
        window.onbeforeunload = null;
        // reload whole page
        location.reload();
      }
    }
  }


  var __parseURL = function(url) {
    var parser = document.createElement('a');
    parser.href = url;
    return parser;
  };

  // get URL back to server
  var script = __getLastTagOfType('script');

  var serverUrl = __parseURL(script.getAttribute('src'));

  var socketIoServer = serverUrl.protocol + '//' + serverUrl.hostname + ':' + serverUrl.port;

  var __loadScript = function(path, onload, onerror) {
    var lr = document.createElement('script'); 
    lr.type = 'text/javascript'; 
    lr.async = true;
    lr.src = socketIoServer + '/' + path;

    lr.onload = onload;
    lr.onerror = onerror;

    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(lr, s);
  };


  __loadScript('socket.io.js', function() {
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

    __socket.on('file_changed', function(file) {
      try {
        window._onLiveReloadFileChanged(file);
      } catch (err) {
        console.error(err);
      }
    });
  }, function() {
    alert("Failed to load livereload script");
  });
})();
