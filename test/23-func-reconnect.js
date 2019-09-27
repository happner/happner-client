var Happner = require('happner-2');
var HappnerClient = require('..');
var path = require('path');
var expect = require('expect.js');

describe('23 - func - exchange reconnect', function() {
  var server, client, api;

  var startServer1 = function(done) {
    // with component
    Happner.create({
      name: 'MESH_NAME',
      util: {
        logLevel: process.env.LOG_LEVEL || 'warn'
      },
      happn: {
        adminPassword: 'xxx'
      },
      modules: {
        component1: {
          path: __dirname + path.sep + 'lib' + path.sep + '23-component-1'
        }
      },
      components: {
        component1: {
          startMethod: 'start',
          stopMethod: 'stop'
        }
      }
    })
      .then(function(_server) {
        server = _server;
      })
      .then(done)
      .catch(done);
  };

  var startServer2 = function(done) {
    // without component
    Happner.create({
      name: 'MESH_NAME',
      util: {
        logLevel: process.env.LOG_LEVEL || 'fatal'
      },
      happn: {
        adminPassword: 'xxx'
      }
    })
      .then(function(_server) {
        server = _server;
      })
      .then(done)
      .catch(done);
  };

  var stopServer = function(done) {
    if (!server) return done();
    server.stop(done);
  };

  before('start server', startServer1);

  before('start client', function(done) {
    var _client = new HappnerClient();

    var model = {
      component1: {
        version: '^1.0.0',
        methods: {
          method1: {}
        }
      }
    };

    api = _client.construct(model);
    _client
      .connect({}, { username: '_ADMIN', password: 'xxx' })
      .then(function() {
        client = _client;
      })
      .then(done)
      .catch(done);
  });

  after('stop client', function(done) {
    if (!client) return done();
    client.disconnect(done);
  });

  after('stop server', stopServer);

  context('reconnect to same server with same name', function() {
    it('can still call exchange methods', function(done) {
      api.exchange.component1.method1(function(e) {
        if (e) return done(e);

        stopServer(function(e) {
          if (e) return done(e);

          client.once('reconnected', function() {
            api.exchange.component1.method1(function(e) {
              if (e) return done(e);
              done();
            });
          });

          startServer1(function(e) {
            if (e) return done(e);
          });
        });
      });
    });

    it('resumes events', function(done) {
      var count = 0;
      var counted;

      api.event.component1.on('event/one', function() {
        count++;
      });

      setTimeout(function() {
        stopServer(function(e) {
          if (e) return done(e);

          counted = count;

          client.once('reconnected', function() {
            setTimeout(function() {
              try {
                expect(count > counted).to.be(true);
                done();
              } catch (e) {
                done(e);
              }
            }, 400);
          });

          startServer1(function(e) {
            if (e) return done(e);
          });
        });
      }, 400);
    });
  });

  context('reconnect to different server with same name', function() {
    beforeEach(stopServer);

    beforeEach(startServer1);

    beforeEach(function(done) {
      client.once('reconnected', done);
    });

    it('gets not implemented error on components no longer present', function(done) {
      api.exchange.component1.method1(function(e) {
        if (e) return done(e);

        stopServer(function(e) {
          if (e) return done(e);

          client.once('reconnected', function() {
            api.exchange.component1.method1(function(e) {
              try {
                expect(e.message).to.match(/^Not implemented/);
                done();
              } catch (e) {
                done(e);
              }
            });
          });

          startServer2(function(e) {
            if (e) return done(e);
          });
        });
      });
    });
  });
});
