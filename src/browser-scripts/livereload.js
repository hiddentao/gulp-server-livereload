(function() {
  var __require, __define;
  if (typeof require !== 'undefined' && typeof requirejs !== 'undefined' && require === requirejs) {
    __require = require;
    __define = define;
    require = define = null;
  }


  var __log = function(msg) {
    console.log('LIVERELOAD: ' + msg);
  };


  var __parseURL = function(url) {
    var parser = document.createElement('a');
    parser.href = url;
    return parser;
  };



  var __getSetupInfo = function() {
    var tags = document.getElementsByTagName('script');

    for (var i=0; i<tags.length; ++i) {
      var tag = tags[i],
        tagSrc = tag.getAttribute('src') || '';

      if (0 < tagSrc.indexOf('livereload.js')) {
        var serverUrl = __parseURL(tagSrc);

        return {
          serverUrl: serverUrl.protocol + '//' + serverUrl.hostname + ':' + serverUrl.port,
          query: serverUrl.search,
        };
      }
    }
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
        var linkTags = document.querySelectorAll('link[rel="stylesheet"]');

        Array.prototype.forEach.call(linkTags, function(linkTag) {
          if (0 <= linkTag.href.indexOf(file.name) && !linkTag.dataset.reloading) {
            var clone = linkTag.cloneNode(false);
            var href = linkTag.getAttribute('href');
            href = __addUrlQueryParam(href, '_lf', Date.now());
            clone.setAttribute('href', href);
            // Only remove the original once the new one loads, to prevent FOUC
            clone.addEventListener('load', function () {
              linkTag.parentElement.removeChild(linkTag)
              __log('reloaded css: ' + file.name);
            });
            linkTag.parentElement.insertBefore(clone, linkTag.nextElementSibling);

            // Prevent race conditions from other reloads before this one finishes
            linkTag.dataset.reloading = true;

            __log('reloading css: ' + file.name);
          }
        });
      }
      // other stuff changed
      else {
        __log('reload browser');

        // disable "confirm reload" dialogs
        window.onbeforeunload = null;
        // reload whole page
        location.reload();
      }
    }
  }



  // get URL back to server
  var setupInfo = __getSetupInfo();
  if (!setupInfo) {
    return __log('unable to find server address');
  } else {
    __log('server at ' + setupInfo.serverUrl);
  }

  var __loadScript = function(path, onload, onerror) {
    __log('load script ' + path);

    var lr = document.createElement('script'); 
    lr.type = 'text/javascript'; 
    lr.async = true;
    lr.src = setupInfo.serverUrl + '/' + path;

    lr.onload = onload;
    lr.onerror = function() {
      __log("failed to load script");
    };

    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(lr, s);
  };


  __alreadyLoadedExtraScripts = false;

  var __loadExtraScripts = function() {
    if (__alreadyLoadedExtraScripts) { 
      return;
    }

    __alreadyLoadedExtraScripts = true;

    // load in extra scripts
    var extras = setupInfo.query.split('=');
    if (1 < extras.length) {
      extras = extras[1].split(",");

      extras.forEach(function(extra) {
        __loadScript(extra + '.js');
      });
    }
  }



  __loadScript('socket.io.js', function() {
    if (__require) {
      require = __require;
      define = __define;
    }

    __log('connecting to server');
    
    var __socket = window.__socket = io.connect(setupInfo.serverUrl);
    
    __socket.on('connect', function() {
      __log('successfully connected');

      __loadExtraScripts();
    });

    __socket.on('connect_error', function(err) {
      __log('failed to connect: ' + err);
    });

    __socket.on('file_changed', function(file) {
      try {
        window._onLiveReloadFileChanged(file);
      } catch (err) {
        console.error(err);
      }
    });
  });

})();
