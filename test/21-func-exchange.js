var Happner = require('happner-2');
var HappnerClient = require('..');
var expect = require('expect.js');
var path = require('path');

describe('21 - func - exchange', function() {
  this.timeout(10000);
  ['insecure', 'secure'].forEach(function(mode) {
    context(mode, function() {
      var server;
      var client;
      var api;

      before('start a server', function(done) {
        this.timeout(10000);
        Happner.create({
          domain: 'DOMAIN_NAME',
          util: {
            logLevel: process.env.LOG_LEVEL || 'warn'
          },
          happn: {
            secure: mode === 'secure',
            adminPassword: 'xxx'
          },
          modules: {
            component1: {
              path:
                __dirname +
                path.sep +
                'lib' +
                path.sep +
                '21-component-1' +
                path.sep +
                '21-component-1.js'
            },
            component2: {
              path:
                __dirname +
                path.sep +
                'lib' +
                path.sep +
                '21-component-2' +
                path.sep +
                '21-component-2.js'
            }
          },
          components: {
            component1: {},
            component2: {}
          }
        })
          .then(function(_server) {
            server = _server;
          })
          .then(done)
          .catch(done);
      });

      before('create client', async () => {
        this.timeout(10000);
        [client, api] = await createClientAndAPI({});
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

      context('callbacks', function() {
        it('can call a function which returns one argument', function(done) {
          api.exchange.component1.methodReturningOneArg('arg1', function(e, result) {
            if (e) return done(e);
            expect(result).to.be('arg1');
            done();
          });
        });

        it('can call a function which returns two arguments', function(done) {
          api.exchange.component1.methodReturningTwoArgs('arg1', 'arg2', function(
            e,
            result1,
            result2
          ) {
            if (e) return done(e);
            expect(result1).to.be('arg1');
            expect(result2).to.be('arg2');
            done();
          });
        });

        it('can call a function which returns an error', function(done) {
          api.exchange.component1.methodReturningError(function(e) {
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

        it('cannot call a function that does not exist', function(done) {
          api.exchange.component1.methodOnApiOnly(function(e) {
            try {
              expect(e).to.be.an(Error);
              expect(e.name).to.equal('Error');
              expect(e.message).to.match(/^Not implemented/);
              done();
            } catch (e) {
              done(e);
            }
          });
        });

        it('cannot call a function with incorrect version', function(done) {
          api.exchange.component2.methodReturningOneArg(function(e) {
            try {
              expect(e).to.be.an(Error);
              expect(e.name).to.equal('Error');
              expect(e.message).to.match(/^Not implemented/);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });

      context('promises', function() {
        it('can call a function which returns one argument', function(done) {
          api.exchange.component1
            .methodReturningOneArg('arg1')
            .then(function(result) {
              expect(result).to.be('arg1');
              done();
            })
            .catch(done);
        });

        it('can call a function which returns two arguments', function(done) {
          api.exchange.component1
            .methodReturningTwoArgs('arg1', 'arg2')
            .then(function(result) {
              expect(result[0]).to.be('arg1');
              expect(result[1]).to.be('arg2');
              done();
            })
            .catch(done);
        });

        it('can call a function which returns an error', function(done) {
          api.exchange.component1.methodReturningError().catch(function(e) {
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

        it('cannot call a function that does not exist', function(done) {
          api.exchange.component1.methodOnApiOnly().catch(function(e) {
            try {
              expect(e).to.be.an(Error);
              expect(e.name).to.equal('Error');
              expect(e.message).to.match(/^Not implemented/);
              done();
            } catch (e) {
              done(e);
            }
          });
        });

        it('cannot call a function with incorrect version', function(done) {
          api.exchange.component2.methodReturningOneArg().catch(function(e) {
            try {
              expect(e).to.be.an(Error);
              expect(e.name).to.equal('Error');
              expect(e.message).to.match(/^Not implemented/);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });
      context('timeouts', function() {
        it('checks the default request and response timeouts are 120 seconds', function() {
          expect(client.__requestTimeout).to.be(120e3);
          expect(client.__responseTimeout).to.be(120e3);
        });

        it('sets up a client with the request and response timeout that is less then long-running method, the request should time out', async () => {
          const [timeoutClient, timeoutApi] = await createClientAndAPI({
            requestTimeout: 5e3,
            responseTimeout: 5e3
          });
          expect(timeoutClient.__requestTimeout).to.be(5e3);
          expect(timeoutClient.__responseTimeout).to.be(5e3);
          let errorMessage;
          try {
            await timeoutApi.exchange.component1.methodThatTimesOut();
          } catch (e) {
            errorMessage = e.message;
          }
          expect(errorMessage).to.be('Timeout awaiting response');
          timeoutClient.disconnect(() => {
            //do nothing
          });
        });
      });
      async function createClientAndAPI(opts) {
        const createdClient = new HappnerClient(opts);

        var model = {
          component1: {
            version: '^1.0.0',
            methods: {
              methodReturningOneArg: {},
              methodReturningTwoArgs: {},
              methodReturningError: {},
              methodOnApiOnly: {},
              methodThatTimesOut: {}
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

        const createdApi = createdClient.construct(model);
        await createdClient.connect(null, { username: '_ADMIN', password: 'xxx' });
        return [createdClient, createdApi];
      }
    });
  });
});
