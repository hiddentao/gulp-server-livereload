(function() {
  var __require, __define;
  if (typeof require !== 'undefined' && typeof requirejs !== 'undefined' && require === requirejs) {
    __require = require;
    __define = define;
    require = define = null;
  }

  var __consoleLog = window.console.log.bind(window.console);
  var __log = function(msg) {
    __consoleLog('LIVERELOAD: ' + msg);
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
    if (0 > href.indexOf('#')) {
      href += '#';
    } else {
      var pos = href.indexOf(key);

      if (0 < pos) {
        href = href.substr(0, pos);
      }
    }

    var lastChar = href.charAt(href.length-1);
    if ('#' !== lastChar && '&' !== lastChar) {
      href += '&';
    }

    href += key + '=' + val;

    return href;
  };


  /*
  Reload page

  We check that page is live and can be accessed before we actually do it.
  This prevents the browser from throwing a 404 error.
   */
  var __currentlyReloading = false;
  var __reloadPage = function() {
    if (__currentlyReloading) {
      return;
    } else {
      __currentlyReloading = true;
    }

    var __reloadPageInnerLoop;

    (__reloadPageInnerLoop = function() {
      __log('wait until we can reload browser');

      var request = new XMLHttpRequest();
      request.open('GET', location.href, true);
      request.onreadystatechange = function(){
        if (request.readyState === 4){
          if (200 <= request.status) {
            __log('reloading page...');

            location.reload();
          } else {
            setTimeout(function() {
              __reloadPageInnerLoop();
            }, 1000);
          }
        }
      };
      request.send();
    })();
  };


  // Generate unique identifier
  // Pseudo-elements can only be styled by CSS
  // and CSS needs a selector. This helps make one
  var __generateUID = function() {
    var array = new Uint32Array(1);
    return parseInt(window.crypto.getRandomValues(array));
  };

  var __newStylesheet = function(id) {
    // Check DOM for already-addded LiveReload stylesheet and return it if it exists
    if(document.getElementById(id)) { return document.getElementById(id).sheet; }
    // If not create it
    var style = document.createElement('style');
    document.head.appendChild(style); // must append before you can access sheet property
    style.id = id;

    return style.sheet;
  };
  
  var __getLiveAssets = function(nodelist, fileName) {
    // nodelist is all the elements to search through
    var arr = Array.from(nodelist),
    results = [];

    arr.forEach(function(el) {
      // Get background-image computed styles for all elements and their pseudo-elements
      // Heads up: getComputedStyle will introduce the protocol (http: or https:)
      // even if you defined it protocol-relative
      var elBg = window.getComputedStyle(el, null).backgroundImage;
      var beforeBg = window.getComputedStyle(el, '::before').backgroundImage;
      var afterBg = window.getComputedStyle(el, '::after').backgroundImage;
      // RegEx pattern to check if asset URL is served from localhost
      // and filename matches the one that triggered the change event
      var re = new RegExp('^url\\([\'"]?(https?:)?\\/\\/(localhost|livereload|charts|192\.168\.0\.1).*' + fileName.replace(/\./g, '\\.'), 'i');
      if (re.test(elBg)) {
        // Valid element, so push to results
        // .slice(5, -2) to clean up URL by removing url(" and ") from CSS value
        // Regular hits just send the DOM node
        results.push({el: el, url: elBg.slice(5, -2) });
      }
      if (re.test(beforeBg)) {
        // Pseudo hits can't send the DOM node
        // So they send a selector for use in crafting a new cssRule
        // Generate unique identifier
        var beforeUID = __generateUID();
        // Make unique selector
        el.setAttribute('data-pseudo', beforeUID);
        // Push a different object to the results array,
        // with the selector instead of the DOM node
        results.push({ sel: '[data-pseudo="' + beforeUID + '"]::before', url: beforeBg.slice(5, -2) });
      }
      if (re.test(afterBg)) {
        var afterUID = __generateUID();
        el.setAttribute('data-pseudo', afterUID);
        results.push({ sel: '[data-pseudo="' + afterUID + '"]::after', url: afterBg.slice(5, -2) });
      }
    });
    return results;
  };


  if (!window._onLiveReloadFileChanged) {
    window._onLiveReloadFileChanged = function(file) {
      if (!file) {
        return;
      }

      // Media changed?
      if (/\.(gif|jpg|jpeg|png|svg|webp)$/i.test(file.ext)) {
        // Live assets from <img> tags
        var imgTags = Array.from(document.images);
        imgTags.forEach(function(imgTag) {
          // Discard if it ain't our changed asset
          if (imgTag.src.indexOf(file.name) >= 0 && !imgTag.complete) { return; }
          if (/(https?:)?\/\/(localhost|livereload|charts|192\.168\.0\.1)/i.test(imgTag.currentSrc)) {
            var src = imgTag.getAttribute('src');
            src = __addUrlQueryParam(src, '_lf', (new Date()).toLocaleTimeString('en-GB'));
            imgTag.setAttribute('src', src);
            imgTag.addEventListener('load', function imgReloaded() {
              __log('reloaded asset: ' + file.name);
              imgTag.removeEventListener('load', imgReloaded);
            });
            // Disabled, too much chatter, only announce on img.
            // __log('reloading asset: ' + file.name);
          }
        });
        
        // Live assets used with CSS background-image.
        var allEls = document.querySelectorAll('body, body *');
        var laEls = __getLiveAssets(allEls, file.name);
        laEls.forEach(function(laEl) {
          // Generate URL string with cache-busting parameter
          var newUrl = __addUrlQueryParam(laEl.url, '_lf', (new Date()).toLocaleTimeString('en-GB'));
          // Is the asset in an element's background-image?
          if (laEl.hasOwnProperty('el')) {
            // Cannot hope to set original CSS style declaration
            // (computed styles are read-only), so just override
            // using a style attribute on the element
            laEl.el.style.backgroundImage = 'url(' + newUrl + ')';
            __log('reloaded CSS asset: ' + file.name);
          }
          // Is the asset in a pseudo-element's background-image?
          else if (laEl.hasOwnProperty('sel')) {
            // TODO BUG: Fails if an element has both ::before and ::after pseudo-elements
            var lrStylesheet = __newStylesheet('lrstyles');
            // TODO: !important rules suck, no toggle in DevTools
            lrStylesheet.insertRule(laEl.sel + ' { background-image: url(' + newUrl + ') !important; }', 0);
            // Pop out the previous rule to prevent pollution
            if(lrStylesheet.cssRules.length > 1) { lrStylesheet.deleteRule(1); }
            __log('reloaded CSS pseudo asset: ' + file.name);
          }
        });
      }

      // CSS changed?
      else if ('.css' === file.ext) {
        var linkTags = document.querySelectorAll('link[rel="stylesheet"]');

        Array.prototype.forEach.call(linkTags, function(linkTag) {
          if (0 <= linkTag.href.indexOf(file.name) && !linkTag.dataset.reloading) {
            var clone = linkTag.cloneNode(false);
            var href = linkTag.getAttribute('href');
            href = __addUrlQueryParam(href, '_lf', Date.now());
            clone.setAttribute('href', href);
            // Only remove the original once the new one loads, to prevent FOUC
            clone.addEventListener('load', function () {
              linkTag.parentElement.removeChild(linkTag);
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
        __reloadPage();
      }
    };
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
