var Happner = require('happner-2');
var HappnerClient = require('..');
var path = require('path');
var expect = require('expect.js');

describe('22 - func - event', function() {
  var server, client, api;

  before('start server', function(done) {
    this.timeout(10000);
    Happner.create({
      util: {
        logLevel: process.env.LOG_LEVEL || 'warn'
      },
      modules: {
        component1: {
          path: __dirname + path.sep + 'lib' + path.sep + '22-component-1'
        },
        component2: {
          path: __dirname + path.sep + 'lib' + path.sep + '22-component-2'
        }
      },
      components: {
        component1: {},
        component2: {
          startMethod: 'start',
          stopMethod: 'stop'
        }
      }
    })
      .then(function(_server) {
        server = _server;
        done();
      })
      .catch(done);
  });

  before('start client', function(done) {
    this.timeout(10000);
    var client = new HappnerClient();
    var model = {
      component1: {
        version: '^1.0.0',
        methods: {
          causeEvent: {}
        }
      },
      component2: {
        version: '^1.0.0', // <------------- wrong version
        methods: {
          causeEvent: {}
        }
      }
    };
    api = client.construct(model);
    client
      .connect()
      .then(done)
      .catch(done);
  });

  after('stop client', function(done) {
    this.timeout(10000);
    if (!client) return done();
    client.disconnect(done);
  });

  after('stop server', function(done) {
    this.timeout(10000);
    if (!server) return done();
    server.stop({ reconnect: false }, done);
  });

  it('can subscribe to events', function(done) {
    api.event.component1.on(
      'event/one',
      function(data, meta) {
        expect(data).to.eql({ DATA: 1 });
        done();
      },
      function(e) {
        if (e) return done(e);

        api.exchange.component1.causeEvent('event/one', function(e) {
          if (e) return done(e);
        });
      }
    );
  });

  it('can unsubscribe by eventId', function(done) {
    var eventId;
    var timeout;

    api.event.component1.on(
      'event/two',
      function(data, meta) {
        clearTimeout(timeout);
        return done(new Error('should be unsubscribed'));
      },
      function(e, _eventId) {
        if (e) return done(e);
        eventId = _eventId;

        api.event.component1.off(eventId, function(e) {
          if (e) return done(e);

          api.exchange.component1.causeEvent('event/two', function(e) {
            if (e) return done(e);
          });

          timeout = setTimeout(function() {
            done();
          }, 200);
        });
      }
    );
  });

  it('can unsubscribe by path', function(done) {
    var timeout;

    api.event.component1.on(
      'event/three',
      function(data, meta) {
        clearTimeout(timeout);
        return done(new Error('should be unsubscribed'));
      },
      function(e) {
        if (e) return done(e);

        api.event.component1.on(
          'event/three',
          function(data, meta) {
            clearTimeout(timeout);
            return done(new Error('should be unsubscribed'));
          },
          function(e) {
            api.event.component1.offPath('event/three', function(e) {
              if (e) return done(e);

              api.exchange.component1.causeEvent('event/three', function(e) {
                if (e) return done(e);
              });

              timeout = setTimeout(function() {
                done();
              }, 200);
            });
          }
        );
      }
    );
  });

  it('does not receive events of wrong version', function(done) {
    var timeout;

    api.event.component2.on(
      'event/one',
      function(data, meta) {
        clearTimeout(timeout);
        return done(new Error('should not receive - wrong version'));
      },
      function(e) {
        if (e) return done(e);

        timeout = setTimeout(function() {
          done();
        }, 200);
      }
    );
  });
});
