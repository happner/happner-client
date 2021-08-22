const test = require('../__fixtures/test-helper').create();
var Happner = require('happner-2');
var HappnerClient = require('../..');

describe(test.name(__filename, 3), function() {
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
              path: test.fixturesPath('21-component-1')
            },
            component2: {
              path: test.fixturesPath('21-component-2')
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
        [client, api] = await createClientAndAPI({ discoverMethods: true });
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
            test.expect(result).to.be('arg1');
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
            test.expect(result1).to.be('arg1');
            test.expect(result2).to.be('arg2');
            done();
          });
        });

        it('can call a function which returns an error', function(done) {
          api.exchange.component1.methodReturningError(function(e) {
            try {
              test.expect(e).to.be.an(Error);
              test.expect(e.name).to.equal('Error');
              test.expect(e.message).to.equal('Component error');
              done();
            } catch (e) {
              done(e);
            }
          });
        });

        it('cannot call a function that does not exist', function(done) {
          api.exchange.component1.methodOnApiOnly(function(e) {
            try {
              test.expect(e).to.be.an(Error);
              test.expect(e.name).to.equal('Error');
              test.expect(e.message).to.match(/^Not implemented/);
              done();
            } catch (e) {
              done(e);
            }
          });
        });

        it('cannot call a function with incorrect version', function(done) {
          api.exchange.component2.methodReturningOneArg(function(e) {
            try {
              test.expect(e).to.be.an(Error);
              test.expect(e.name).to.equal('Error');
              test.expect(e.message).to.match(/^Not implemented/);
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
              test.expect(result).to.be('arg1');
              done();
            })
            .catch(done);
        });

        it('can call a function which returns two arguments', function(done) {
          api.exchange.component1
            .methodReturningTwoArgs('arg1', 'arg2')
            .then(function(result) {
              test.expect(result[0]).to.be('arg1');
              test.expect(result[1]).to.be('arg2');
              done();
            })
            .catch(done);
        });

        it('can call a function which returns an error', function(done) {
          api.exchange.component1.methodReturningError().catch(function(e) {
            try {
              test.expect(e).to.be.an(Error);
              test.expect(e.name).to.equal('Error');
              test.expect(e.message).to.equal('Component error');
              done();
            } catch (e) {
              done(e);
            }
          });
        });

        it('cannot call a function that does not exist', function(done) {
          api.exchange.component1.methodOnApiOnly().catch(function(e) {
            try {
              test.expect(e).to.be.an(Error);
              test.expect(e.name).to.equal('Error');
              test.expect(e.message).to.match(/^Not implemented/);
              done();
            } catch (e) {
              done(e);
            }
          });
        });

        it('cannot call a function with incorrect version', function(done) {
          api.exchange.component2.methodReturningOneArg().catch(function(e) {
            try {
              test.expect(e).to.be.an(Error);
              test.expect(e.name).to.equal('Error');
              test.expect(e.message).to.match(/^Not implemented/);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });

      context('timeouts', function() {
        it('checks the default request and response timeouts are 120 seconds', function() {
          test.expect(client.__requestTimeout).to.be(60e3);
          test.expect(client.__responseTimeout).to.be(120e3);
        });

        it('sets up a client with the request and response timeout that is less then long-running method, the request should time out', async () => {
          const [timeoutClient, timeoutApi] = await createClientAndAPI({
            requestTimeout: 5e3,
            responseTimeout: 5e3,
            discoverMethods: true
          });
          test.expect(timeoutClient.__requestTimeout).to.be(5e3);
          test.expect(timeoutClient.__responseTimeout).to.be(5e3);
          let errorMessage;
          try {
            await timeoutApi.exchange.component1.methodThatTimesOut();
          } catch (e) {
            errorMessage = e.message;
          }
          test.expect(errorMessage).to.be('Timeout awaiting response');
          timeoutClient.disconnect(() => {
            //do nothing
          });
        });
      });
      context('$call', function() {
        it('can call a function which returns one argument', async () => {
          let result = await api.exchange.$call({
            component: 'component1',
            method: 'methodReturningOneArg',
            arguments: ['arg1']
          });
          test.expect(result).to.be('arg1');
        });

        it('can call a function which returns two arguments', async () => {
          let [result1, result2] = await api.exchange.$call({
            component: 'component1',
            method: 'methodReturningTwoArgs',
            arguments: ['arg1', 'arg2']
          });
          test.expect(result1).to.be('arg1');
          test.expect(result2).to.be('arg2');
        });

        it('can call a function which returns an error', async () => {
          let eMessage = '';
          try {
            await api.exchange.$call({
              component: 'component1',
              method: 'methodReturningError'
            });
          } catch (e) {
            eMessage = e.message;
          }
          test.expect(eMessage).to.equal('Component error');
        });

        it('cannot call a function that does not exist', async () => {
          let eMessage = '';
          try {
            await api.exchange.$call({
              component: 'component1',
              method: 'methodOnApiOnly'
            });
          } catch (e) {
            eMessage = e.message;
          }
          test.expect(eMessage).to.equal('Not implemented component1:^1.0.0:methodOnApiOnly');
        });

        it('cannot call a function with incorrect version', async () => {
          let eMessage = '';
          try {
            await api.exchange.$call({
              component: 'component2',
              method: 'methodReturningOneArg'
            });
          } catch (e) {
            eMessage = e.message;
          }
          test.expect(eMessage).to.equal('Not implemented component2:^1.0.0:methodReturningOneArg');
        });
      });
      async function createClientAndAPI(opts) {
        const createdClient = new HappnerClient(opts);

        var model = {
          component1: {
            version: '^1.0.0',
            methods: {
              methodOnApiOnly: {}
            }
          },
          component2: {
            version: '^1.0.0'
          }
        };
        await createdClient.connect(null, {
          username: '_ADMIN',
          password: 'xxx'
        });
        const createdApi = createdClient.construct(model);
        return [createdClient, createdApi];
      }
    });
  });
});
