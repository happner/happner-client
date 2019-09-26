var path = require('path');
var expect = require('expect.js');
var Happner = require('happner-2');
var HappnerClient = require('..');

var certPath = path.dirname(__dirname) + path.sep + 'example.com.cert';
var keyPath = path.dirname(__dirname) + path.sep + 'example.com.key';

describe('20 - func - connect', function() {
  var server;

  function startServer(done) {
    if (this.timeout) this.timeout(10000);
    if (server) return done();
    Happner.create({
      util: {
        logLevel: process.env.LOG_LEVEL || 'warn'
      },
      happn: {
        secure: true,
        adminPassword: 'xxx',
        services: {
          transport: {
            config: {
              mode: 'https',
              certPath: certPath,
              keyPath: keyPath
            }
          }
        }
      }
    })
      .then(function(_server) {
        server = _server;
      })
      .then(done)
      .catch(done);
  }

  function stopServer(done) {
    if (!server) return done();
    server.stop(function(e) {
      server = undefined;
      done(e);
    });
  }

  function stopServerDisconnect(done) {
    if (!server) return done();
    server.stop({ reconnect: false }, function(e) {
      server = undefined;
      done(e);
    });
  }

  beforeEach('start server', startServer);

  after('stop server', stopServer);

  it('supports callback', function(done) {
    var c = new HappnerClient();
    c.connect(
      {
        // config: {
        host: 'localhost',
        port: 55000
        // }
      },
      {
        username: '_ADMIN',
        password: 'xxx',
        info: 'fo',
        protocol: 'https',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);
        c.disconnect(done);
      }
    );
  });

  it('supports promise', function(done) {
    var c = new HappnerClient();
    c.on('error', function() {});
    c.connect(
      {
        host: '127.0.0.1',
        port: 9999 // <------------------- intentionally wrong
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      }
    )
      .catch(function(e) {
        expect(e.code).to.be('ECONNREFUSED');
      })
      .then(function() {
        c.disconnect(done);
      })
      .catch(function(e) {
        c.disconnect(function() {});
        done(e);
      });
  });

  it('defaults', function(done) {
    // inherits happn defaulting
    var c = new HappnerClient();
    c.connect(
      {
        // host: 'localhost',
        // port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);
        c.disconnect(done);
      }
    );
  });

  it('emits connected on connect', function(done) {
    var c = new HappnerClient();
    c.on('connected', function() {
      c.disconnect(done);
    });
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function() {}
    );
  });

  it('emits disconnected on normal disconnect', function(done) {
    var c = new HappnerClient();
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);

        c.on('disconnected', function() {
          c.disconnect(function(e) {
            setTimeout(function() {
              // wait for server to finish stopping before next test
              // so that beforeHook knows to restart it
              if (e) return done(e);
              done();
            }, 200);
          });
        });

        stopServerDisconnect(function(e) {
          if (e) return done(e);
        });
      }
    );
  });

  it('emits disconnected even if server was stopped with reconnect true', function(done) {
    var c = new HappnerClient();
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);

        c.on('disconnected', function() {
          c.disconnect(function(e) {
            // FAILING: happn-3/issues/13
            // disconnect does not callback if already disconnected
            setTimeout(function() {
              if (e) return done(e);
              done();
            }, 200);
          });
        });

        stopServer(function(e) {
          if (e) return done(e);
        });
      }
    );
  });

  it('emits reconnected on reconnect', function(done) {
    this.timeout(20000);
    var c = new HappnerClient();
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);

        c.on('reconnected', function() {
          c.disconnect(function(e) {
            setTimeout(function() {
              if (e) return done(e);
              done();
            }, 200);
          });
        });

        stopServer(function(e) {
          if (e) return done(e);
          startServer(function(e) {
            if (e) return done(e);
          });
        });
      }
    );
  });

  it('emits reconnecting on reconnecting', function(done) {
    var c = new HappnerClient();
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);

        c.on('reconnecting', function() {
          c.disconnect(function(e) {
            // FAILING: happn-3/issues/13
            // disconnect does not callback if already disconnected
            setTimeout(function() {
              if (e) return done(e);
              done();
            }, 200);
          });
        });

        stopServer(function(e) {
          if (e) return done(e);
        });
      }
    );
  });
});
