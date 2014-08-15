gulp-server-livereload [![Build Status](http://img.shields.io/travis/hiddentao/gulp-server-livereload.svg?style=flat)](https://travis-ci.org/hiddentao/gulp-server-livereload)
==============

> Gulp plugin to run a local webserver with live reload using socket.io

**This is a fork of [gulp-webserver](https://github.com/schickling/gulp-webserver)**. This version uses [socket.io](http://socket.io) instead of [tiny-lr](https://github.com/mklabs/tiny-lr) so that the livereload mechanism works even if your browser does not support WebSockets (PhoneGap developers should be happy!).

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

## Options

Key | Type | Default | Description |
--- | --- | --- | --- |
`host` | String | `localhost` | hostname of the webserver
`port` | Number | `8000` | port of the webserver
`livereload` | Boolean/Object | `false` | whether to use livereload. For advanced options, provide an object. You can use the `port` property to set a custom live reload port (default is `32579`).
`directoryListing` | Boolean/Object | `false` | whether to display a directory listing. For advanced options, provide an object. You can use the `path property to set a custom path or the `options` property to set custom [serve-index](https://github.com/expressjs/serve-index) options.
`defaultFile` | String | `index.html` | default file to show when root URL is requested. If `directoryListing` is enabled then this gets disabled.
`open` | Boolean/Object | `false` | open the localhost server in the browser
`https` | Boolean/Object | `false` | whether to use https or not. By default, `gulp-webserver` provides you with a development certificate but you remain free to specify a path for your key and certificate by providing an object like this one: `{key: 'path/to/key.pem', cert: 'path/to/cert.pem'}`.

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

## License

MIT - see LICENSE.md












