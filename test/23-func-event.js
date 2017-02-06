var Happner = require('happner-2');
var HappnerClient = require('..');
var path = require('path');
var once = require('once');
var expect = require('expect.js');

describe('23 - func - event', function () {

  var server, client, api;

  before('start server', function (done) {
    Happner.create({
      modules: {
        'component1': {
          path: __dirname + path.sep + 'lib' + path.sep + '23-component-1'
        }
      },
      components: {
        'component1': {
          startMethod: 'start',
          stopMethod: 'stop'
        }
      }
    })
      .then(function (_server) {
        server = _server;
        done();
      })
      .catch(done);
  });

  before('start client', function (done) {
    var client = new HappnerClient();
    var model = {
      component1: {
        version: '^1.0.0'
      }
    };
    api = client.construct(model);
    client.connect().then(done).catch(done);
  });

  after('stop client', function (done) {
    if (!client) return done();
    client.disconnect(done);
  });

  after('stop server', function (done) {
    if (!server) return done();
    server.stop({reconnect: false}, done);
  });

  it('can subscribe to events', function (done) {

    var Done = once(done);

    api.event.component1.on('event/one', function (data, meta) {
      expect(data).to.eql({event: 1});
      Done();
    })

  });

  it('can unsubscribe by eventId', function (done) {

    var count = 0;

    api.event.component1.on('event/two', function (data, meta) {
      count++;
    }, function (e, eventId) {
      if (e) return done(e);

      api.event.component1.off(eventId, function (e) {
        if (e) return done(e);

        setTimeout(function () {
          if (count > 1) {
            return done(new Error('did not unsubscribe'));
          }
          done();
        }, 500);

      });

    });

  });

  it('can unsubscribe by path', function (done) {

    var count = 0;

    api.event.component1.on('event/three', function (data, meta) {
      count++;
    }, function (e, eventId) {
      if (e) return done(e);

      api.event.component1.on('event/three', function (data, meta) {
        count++;
      }, function (e, eventId) {
        if (e) return done(e);

        api.event.component1.offPath('event/three', function (e) {
          if (e) return done(e);

          setTimeout(function () {
            if (count > 1) {
              return done(new Error('did not unsubscribe'));
            }
            done();
          }, 500);

        });

      });

    });

  });

  it('does not receive events of wrong version');

});
