(function(){
  var socket = window.__socket;

  if (!socket) {
    return;
  }

  var __console = {};

  ['error','info','log','warn'].forEach(function(method) {
    window.console[method] = (function() {
      __console[method] = window.console[method];

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
            socket.emit('console', {
              method: method,
              data: args
            });
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
    })();
  });

})();
