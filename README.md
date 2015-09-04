gulp-server-livereload [![Build Status](http://img.shields.io/travis/hiddentao/gulp-server-livereload.svg?style=flat)](https://travis-ci.org/hiddentao/gulp-server-livereload)
==============

> Gulp plugin to run a local webserver with live reload using socket.io

Serve a folder over HTTP and watch it for changes, telling the browser to 
reload itself when a change happens.

* Uses [socket.io](http://socket.io) - livereload mechanism works even 
if your browser does not support WebSockets (PhoneGap developers rejoice!).

* `window.console` capture - it can capture `console` output from the 
client-side and transmit it to the back-end for display. This is useful for 
when testing from Phonegap, etc.

* Supports [CSS injection](#livereload-behaviour) (no need to reload the whole page if just your CSS 
has changed).

* Comes with a command-line runnable.

This was originally a fork of [gulp-webserver](https://github.com/schickling/gulp-webserver).

## Installation

```sh
$ npm install --save-dev gulp-server-livereload
```

## Usage

The folder supplied to `gulp.src()` will be the root folder from which files will be served.

```js
var gulp = require('gulp');
var server = require('gulp-server-livereload');

gulp.task('webserver', function() {
  gulp.src('app')
    .pipe(server({
      livereload: true,
      directoryListing: true,
      open: true
    }));
});
```

If you run `gulp webserver` your browser should automatically open up to `http://localhost:8000` and show a directory listing of the `app` folder.

**Note:** In order for the livereload browser-side code to be injected properly 
your HTML must have a closing `</body> tag.

### Command-line

Install the package globally:

```bash
$ npm install -g gulp-server-livereload
```

Then you can run the `livereload` command to serve files out of the current folder. 
Here are the available options:

```bash
$ livereload help

  Usage: livereload [options]

  Options:

    -h, --help        output usage information
    -V, --version     output the version number
    -n, --no-browser  do not open the localhost server in a browser
    -l, --log [type]  log level (default: info)
    -p, --port <n>    the port to run on
```


## Options

_Note: not all of these options are currently available via the CLI executable_

Key | Type | Default | Description |
--- | --- | --- | --- |
`host` | String | `localhost` | hostname of the webserver
`port` | Number | `8000` | port of the webserver
`livereload` | Boolean/Object | `false` | whether to use livereload. For advanced options, provide an object. 
`livereload.port` | Number | `35729` | port for livereload server to listen on.
`livereload.filter` | Function | - | function to filter out files to watch (default filters out `node_modules`).
`livereload.clientConsole` | Boolean | `false` | whether to capture `window.console` output from the client and send it to the back-end for display.
`directoryListing` | Boolean/Object | `false` | whether to display a directory listing. For advanced options, provide an object. You can use the `path property to set a custom path or the `options` property to set custom [serve-index](https://github.com/expressjs/serve-index) options.
`defaultFile` | String | `index.html` | default file to show when root URL is requested. If `directoryListing` is enabled then this gets disabled.
`open` | Boolean/Object | `false` | open the localhost server in the browser
`https` | Boolean/Object | `false` | whether to use https or not. By default, `gulp-server-livereload` provides you with a development certificate but you remain free to specify a path for your key and certificate by providing an object like this one: `{key: 'path/to/key.pem', cert: 'path/to/cert.pem'}`.
`log` | String | `info` | If set to `debug` you will see all requests logged to the console.


## Livereload behaviour

By default when a file changes the livereload script in the browser does the 
following:

1. Checks to see whether the changed file is a CSS file
2. If it is a CSS file then it reloads the changed CSS files in the browser
3. Otherwise it reloads the whole page

To override the default behaviour define the following method in Javascript:

```js
/** 
 * This method gets called by the livereload script when the server notifies it 
 * that something has changed.
 * 
 * @param  {Object} file File which changed.
 */
window._onLiveReloadFileChanged = function(file) {
  // do whatever you want here, e.g. location.reload();  
}
```

The `file` parameter has the following structure:

```js
{
  "path": ...full path to file which changed...
  "name": ...file name (without path)...
  "ext": ...file extension name...
}
```


## FAQ

#### Why can't I reach the server from the network?

Set `0.0.0.0` as the `host` option.

#### How can I set main.html to automatically load when I visit the URL?

Set the `defaultFile` to `main.html`:

```js
gulp.task('webserver', function() {
  gulp.src('app')
    .pipe(server({
      defaultFile: 'main.html'
    }));
});
```

#### How can I use livereload if my HTML is already being served up by a node.js/other app?

You'll have to add a `<script>` tag to your HTML to load in the browser-side scripts. 

For example, if the `gulp-server-livereload` livereload port is set to 34322 then you would add:

```html
<script type='text/javascript' src='http://localhost:34322/livereload.js'></script>
```

To enable console logging capture use:

```html
<script type='text/javascript' src='http://localhost:34322/livereload.js?extra=capture-console'></script>
```


#### How can I pass a custom filter to livereload?

In the `livereload` object, set the `enable` to `true` and provide filter function in `filter`:

```js
gulp.task('webserver', function() {
  gulp.src('app')
    .pipe(server({
      livereload: {
        enable: true,
        filter: function(filePath, cb) {
          cb( !(/node_modules/.test(filePath)) );
        }
      }
    }));
});
```


## License

MIT - see LICENSE.md
