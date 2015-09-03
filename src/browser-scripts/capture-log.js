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
