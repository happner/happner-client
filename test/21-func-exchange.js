var Happner = require('happner-2');
var HappnerClient = require('..');
var expect = require('expect.js');
var path = require('path');

describe('21 - func - exchange', function () {

  ['insecure', 'secure'].forEach(function (mode) {

    context(mode, function () {

      var server;
      var client;
      var api;

      before('start a server', function (done) {

        Happner.create({
          happn: {
            secure: mode == 'secure'
          },
          modules: {
            'component1': {
              path: __dirname + path.sep + 'lib' + path.sep + '21-component-1' + path.sep + '21-component-1.js'
            },
            'component2': {
              path: __dirname + path.sep + 'lib' + path.sep + '21-component-2' + path.sep + '21-component-2.js'
            }
          },
          components: {
            'component1': {},
            'component2': {}
          }
        }).then(function (_server) {
          server = _server;
        }).then(done)
          .catch(done);
      });

      before('create client', function (done) {
        client = new HappnerClient();

        var model = {
          component1: {
            version: '^1.0.0',
            methods: {
              methodReturningOneArg: {},
              methodReturningTwoArgs: {},
              methodReturningError: {},
              methodOnApiOnly: {}

            }
          },
          component2: {
            version: '^1.0.0',
            methods: {
              methodReturningOneArg: {},
              methodReturningTwoArgs: {},
              methodReturningError: {},
              methodOnApiOnly: {}
            }
          }
        };

        api = client.construct(model);
        client.connect([{username: '_ADMIN', password: 'happn'}], done);
      });

      after('stop client', function (done) {

        if (!client) return done();
        client.disconnect(done);

      });

      after('stop server', function (done) {

        if (!server) return done();
        server.stop({reconnect: false}, done);

      });

      context('callbacks', function () {

        it('can call a function which returns one argument', function (done) {
          api.exchange.component1.methodReturningOneArg('arg1', function (e, result) {
            if (e) return done(e);
            expect(result).to.be('arg1');
            done();
          });
        });

        it('can call a function which returns two arguments', function (done) {
          api.exchange.component1.methodReturningTwoArgs('arg1', 'arg2', function (e, result1, result2) {
            if (e) return done(e);
            expect(result1).to.be('arg1');
            expect(result2).to.be('arg2');
            done();
          });
        });

        it('can call a function which returns an error', function (done) {
          api.exchange.component1.methodReturningError(function (e) {
            try {
              expect(e).to.be.an(Error);
              expect(e.name).to.equal('Error');
              expect(e.message).to.equal('Component error');
              done();
            } catch (e) {
              done(e);
            }
          });
        });

        it('cannot call a function that does not exist', function (done) {
          api.exchange.component1.methodOnApiOnly(function (e) {
            try {
              expect(e).to.be.an(Error);
              expect(e.name).to.equal('Error');
              expect(e.message).to.equal('Not implemented');
              done();
            } catch (e) {
              done(e);
            }
          });
        });

        it('cannot call a function with incorrect version', function (done) {
          api.exchange.component2.methodReturningOneArg(function (e) {
            try {
              expect(e).to.be.an(Error);
              expect(e.name).to.equal('Error');
              expect(e.message).to.equal('Not implemented');
              done();
            } catch (e) {
              done(e);
            }
          });
        });

      });

      context('promises', function () {

        it('can call a function which returns one argument', function (done) {
          api.exchange.component1.methodReturningOneArg('arg1')
            .then(function (result) {
              expect(result).to.be('arg1');
              done();
            }).catch(done);
        });

        it('can call a function which returns two arguments', function (done) {
          api.exchange.component1.methodReturningTwoArgs('arg1', 'arg2')
            .then(function (result) {
              expect(result[0]).to.be('arg1');
              expect(result[1]).to.be('arg2');
              done();
            }).catch(done);
        });

        it('can call a function which returns an error', function (done) {
          api.exchange.component1.methodReturningError()
            .catch(function (e) {
              try {
                expect(e).to.be.an(Error);
                expect(e.name).to.equal('Error');
                expect(e.message).to.equal('Component error');
                done();
              } catch (e) {
                done(e);
              }
            });
        });

        it('cannot call a function that does not exist', function (done) {
          api.exchange.component1.methodOnApiOnly()
            .catch(function (e) {
              try {
                expect(e).to.be.an(Error);
                expect(e.name).to.equal('Error');
                expect(e.message).to.equal('Not implemented');
                done();
              } catch (e) {
                done(e);
              }
            });
        });

        it('cannot call a function with incorrect version', function (done) {
          api.exchange.component2.methodReturningOneArg()
            .catch(function (e) {
              try {
                expect(e).to.be.an(Error);
                expect(e.name).to.equal('Error');
                expect(e.message).to.equal('Not implemented');
                done();
              } catch (e) {
                done(e);
              }
            });
        });
      });
    });
  });
});
