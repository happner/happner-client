const test = require('../__fixtures/test-helper').create();
var Happner = require('happner-2');
var HappnerClient = require('../..');

describe(test.name(__filename, 3), function() {
  var server, client, api;
  this.timeout(20000);

  before('start server', function(done) {
    this.timeout(20000);
    Happner.create({
      util: {
        logLevel: process.env.LOG_LEVEL || 'warn'
      },
      modules: {
        component1: {
          path: test.fixturesPath() + test.path.sep + '22-component-1'
        },
        component2: {
          path: test.fixturesPath() + test.path.sep + '22-component-2'
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
    client = new HappnerClient();
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

  // after('open handles', async () => {
  //   await test.listOpenHandles(10000);
  // });

  it('can subscribe to events', function(done) {
    api.event.component1.on(
      'event/one',
      function(data) {
        test.expect(data).to.eql({ DATA: 1 });
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
      function() {
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
      function() {
        clearTimeout(timeout);
        return done(new Error('should be unsubscribed'));
      },
      function(e) {
        if (e) return done(e);

        api.event.component1.on(
          'event/three',
          function() {
            clearTimeout(timeout);
            return done(new Error('should be unsubscribed'));
          },
          function(e) {
            if (e) return done(e);
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
      function() {
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
