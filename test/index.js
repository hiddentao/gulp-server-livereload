var _ = require('lodash');
var Q = require('bluebird');
var path = require('path');
var request = require('supertest');
var webserver = require('../src');
var Vinyl = require('vinyl');

// Some configuration to enable https testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var DEFAULT_SERVER_START_WAIT_MS = 1000;
var DEFAULT_SERVER_KILL_WAIT_MS = 500;

describe('gulp-server-livereload', function() {
  var stream;
  var proxyStream;

  var rootDir = new Vinyl({
    path: path.join(__dirname, 'fixtures')
  });

  var directoryIndexMissingDir = new Vinyl({
    path: path.join(__dirname, 'fixtures/directoryIndexMissing')
  });

  var directoryProxiedDir = new Vinyl({
    path: __dirname + '/fixtures/directoryProxied'
  });

  var directoryFallback = new Vinyl({
    path: path.join(__dirname, 'fixtures/directoryFallback')
  });

  afterEach(function(done) {
    stream.emit('kill');

    if (proxyStream) {
      proxyStream.emit('kill');
      proxyStream = undefined;
    }

    Q.delay(DEFAULT_SERVER_KILL_WAIT_MS).then(done, done);
  });

  it('should work with default options', function(done) {
    stream = webserver();

    Q.promisify(stream.write, { context: stream })(rootDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:8000')
          .get('/')
          .expect(200, /Hello World/)
          .end(done);
      })
      .catch(done);
  });

  it('should work with custom port', function(done) {
    stream = webserver({
      port: 1111
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:1111')
          .get('/')
          .expect(200, /Hello World/)
          .end(done);
      })
      .catch(done);
  });

  it('should work with custom host', function(done) {
    stream = webserver({
      host: '0.0.0.0'
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://0.0.0.0:8000')
          .get('/')
          .expect(200, /Hello World/)
          .end(done);
      })
      .catch(done);
  });

  it('should work with https', function(done) {
    stream = webserver({
      https: true
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('https://localhost:8000')
          .get('/')
          .expect(200, /Hello World/)
          .end(done);
      })
      .catch(done);
  });

  it('should work with https and a custom certificate', function(done) {
    stream = webserver({
      https: {
        key: __dirname + '/../ssl/dev-key.pem',
        cert: __dirname + '/../ssl/dev-cert.pem'
      }
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('https://localhost:8000')
          .get('/')
          .expect(200, /Hello World/)
          .end(done);
      })
      .catch(done);
  });

  it('should show default.html', function(done) {
    stream = webserver({
      defaultFile: 'default.html'
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:8000')
          .get('/')
          .expect(200, /Default/)
          .end(done);
      })
      .catch(done);
  });

  it('should show a directory listing when the shorthand setting is enabled', function(done) {
    stream = webserver({
      directoryListing: true
    });

    Q.promisify(stream.write, { context: stream })(directoryIndexMissingDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:8000')
          .get('/')
          .expect(200, /listing directory/)
          .end(done);
      })
      .catch(done);
  });

  it('should not show a directory listing when the shorthand setting is disabled', function(done) {
    stream = webserver({
      directoryListing: false
    });

    Q.promisify(stream.write, { context: stream })(directoryIndexMissingDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:8000')
          .get('/')
          .expect(404, /Cannot GET/)
          .end(done);
      })
      .catch(done);
  });

  it('should start the livereload server when the shorthand setting is enabled', function(done) {
    stream = webserver({
      livereload: true
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:8000')
          .get('/')
          .expect(200, /Hello World/)
          .end(function(err) {
            if (err) {
              return done(err);
            }

            request('http://localhost:35729')
              .get('/socket.io.js')
              .expect(200, /socket\.io/)
              .end(done);
          });
      })
      .catch(done);
  });

  it('should not start the livereload server when the shorthand setting is disabled', function(done) {
    stream = webserver({
      livereload: false
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:8000')
          .get('/')
          .expect(200, /Hello World/)
          .end(function(err) {
            if (err) {
              return done(err);
            }

            request('http://localhost:35729')
              .get('/socket.io.js')
              .end(function(err) {
                if (err && err.code === 'ECONNREFUSED') {
                  done();
                } else {
                  if (err) {
                    return done(err);
                  } else {
                    done(
                      new Error(
                        'livereload should not be started when shorthand middleware setting is set to false'
                      )
                    );
                  }
                }
              });
          });
      })
      .catch(done);
  });

  it('should proxy requests to localhost:8001', function(done) {
    stream = webserver({
      proxies: [
        {
          source: '/proxied',
          target: 'http://localhost:8001'
        }
      ]
    });

    proxyStream = webserver({
      port: 8001
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .then(function() {
        return Q.promisify(proxyStream.write, {
          context: proxyStream
        })(directoryProxiedDir);
      })
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:8000')
          .get('/')
          .expect(200, /Hello World/)
          .end(function(err) {
            if (err) {
              return done(err);
            }

            request('http://localhost:8000')
              .get('/proxied')
              .expect(200, /I am Ron Burgandy?/)
              .end(done);
          });
      })
      .catch(done);
  });

  it('should configure proxy with options', function(done) {
    stream = webserver({
      proxies: [
        {
          source: '/proxied',
          target: 'http://localhost:8001',
          options: {
            headers: {
              'X-forwarded-host': 'localhost:8000'
            }
          }
        }
      ]
    });

    proxyStream = webserver({
      port: 8001
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .then(function() {
        return Q.promisify(proxyStream.write, {
          context: proxyStream
        })(directoryProxiedDir);
      })
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:8000')
          .get('/')
          .expect(200, /Hello World/)
          .end(function(err) {
            if (err) {
              return done(err);
            }

            request('http://localhost:8000')
              .get('/proxied')
              .expect(200, /I am Ron Burgandy?/)
              .end(done);
          });
      })
      .catch(done);
  });

  it('should allow for fallback file', function(done) {
    stream = webserver({
      fallback: 'fallback.html'
    });

    Q.promisify(stream.write, { context: stream })(directoryFallback)
      .then(function() {
        stream.end();
      })
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(function() {
        request('http://localhost:8000')
          .get('/')
          .expect(200, /fallback/)
          .end(done);
      })
      .catch(done);
  });

  it('should accept `true` as an open option', function(done) {
    stream = webserver({
      open: true
    });

    Q.promisify(stream.write, { context: stream })(rootDir)
      .delay(DEFAULT_SERVER_START_WAIT_MS)
      .then(done)
      .catch(done);
  });
});
