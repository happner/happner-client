const Happner = require('happner-2');
const LightClient = require('..').Light;
const expect = require('expect.js');
const path = require('path');
const DOMAIN = 'DOMAIN_NAME';

describe('25 - func - light-client', function() {
  this.timeout(10000);
  ['insecure', 'secure'].forEach(function(mode) {
    context(mode, function() {
      var server;
      var client;

      before('start a server', function(done) {
        this.timeout(10000);
        Happner.create({
          domain: DOMAIN,
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
        client = await createClient({ domain: DOMAIN, secure: mode === 'secure' });
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
          client.exchange.$call(
            {
              component: 'component1',
              method: 'methodReturningOneArg',
              arguments: ['arg1']
            },
            function(e, result) {
              if (e) return done(e);
              expect(result).to.be('arg1');
              done();
            }
          );
        });

        it('fails to call a component that does not exist', function(done) {
          client.exchange.$call(
            {
              component: 'nonExistentComponent',
              method: 'methodReturningOneArg',
              arguments: ['arg1']
            },
            function(e) {
              expect(e.message).to.be(
                'Call to unconfigured component: [nonExistentComponent.methodReturningOneArg]'
              );
              done();
            }
          );
        });

        it('fails call a method that does not exist', function(done) {
          client.exchange.$call(
            {
              component: 'component1',
              method: 'nonExistentMethod',
              arguments: ['arg1']
            },
            function(e) {
              expect(e.message).to.be(
                'Call to unconfigured method [component1.nonExistentMethod()]'
              );
              done();
            }
          );
        });

        it('can call a function which returns two arguments', function(done) {
          client.exchange.$call(
            {
              component: 'component1',
              method: 'methodReturningTwoArgs',
              arguments: ['arg1', 'arg2']
            },
            function(e, result1, result2) {
              if (e) return done(e);
              expect(result1).to.be('arg1');
              expect(result2).to.be('arg2');
              done();
            }
          );
        });

        it('can call a function which returns an error', function(done) {
          client.exchange.$call(
            {
              component: 'component1',
              method: 'methodReturningError',
              arguments: []
            },
            function(e) {
              try {
                expect(e).to.be.an(Error);
                expect(e.name).to.equal('Error');
                expect(e.message).to.equal('Component error');
                done();
              } catch (e) {
                done(e);
              }
            }
          );
        });

        it('cannot call a function that does not exist', function(done) {
          client.exchange.$call(
            {
              component: 'component1',
              method: 'methodOnApiOnly',
              arguments: []
            },
            function(e) {
              try {
                expect(e).to.be.an(Error);
                expect(e.name).to.equal('Error');
                expect(e.message).to.be(
                  'Call to unconfigured method [component1.methodOnApiOnly()]'
                );
                done();
              } catch (e) {
                done(e);
              }
            }
          );
        });

        it('cannot call a function with incorrect version', function(done) {
          client.exchange.$call(
            {
              component: 'component2',
              version: '1.0.0',
              method: 'methodReturningOneArg',
              arguments: ['arg1']
            },
            function(e) {
              try {
                expect(e).to.be.an(Error);
                expect(e.name).to.equal('Error');
                expect(e.message).to.be(
                  `Call to unconfigured method [component2.methodReturningOneArg]: request version [1.0.0] does not match component version [2.0.0]`
                );
                done();
              } catch (e) {
                done(e);
              }
            }
          );
        });
      });

      context('promises', function() {
        it('can call a function which returns one argument', async () => {
          const results = await client.exchange.$call({
            component: 'component1',
            method: 'methodReturningOneArg',
            arguments: ['arg1']
          });
          expect(results).to.eql(['arg1']);
        });

        it('can call a function which returns two arguments', async () => {
          const results = await client.exchange.$call({
            component: 'component1',
            method: 'methodReturningTwoArgs',
            arguments: ['arg1', 'arg2']
          });
          expect(results).to.eql(['arg1', 'arg2']);
        });

        async function callWithExpectedError(parameters, errorMessage) {
          let error;
          try {
            await client.exchange.$call(parameters);
          } catch (e) {
            error = e;
          }
          expect(error).to.be.an(Error);
          expect(error.message).to.be(errorMessage);
        }

        it('fails to call a component that does not exist', async () => {
          await callWithExpectedError(
            {
              component: 'nonExistentComponent',
              method: 'methodReturningOneArg',
              arguments: ['arg1']
            },
            'Call to unconfigured component: [nonExistentComponent.methodReturningOneArg]'
          );
        });

        it('fails call a method that does not exist', async () => {
          await callWithExpectedError(
            {
              component: 'component1',
              method: 'nonExistentMethod',
              arguments: ['arg1']
            },
            'Call to unconfigured method [component1.nonExistentMethod()]'
          );
        });

        it('can call a function which returns an error', async () => {
          await callWithExpectedError(
            {
              component: 'component1',
              method: 'methodReturningError',
              arguments: []
            },
            'Component error'
          );
        });

        it('cannot call a function that does not exist', async () => {
          await callWithExpectedError(
            {
              component: 'component1',
              method: 'methodOnApiOnly',
              arguments: []
            },
            'Call to unconfigured method [component1.methodOnApiOnly()]'
          );
        });

        it('cannot call a function with incorrect version', async () => {
          await callWithExpectedError(
            {
              component: 'component2',
              version: '1.0.0',
              method: 'methodReturningOneArg',
              arguments: ['arg1']
            },
            `Call to unconfigured method [component2.methodReturningOneArg]: request version [1.0.0] does not match component version [2.0.0]`
          );
        });
      });

      xcontext('timeouts', function() {
        it('checks the default request and response timeouts are 120 seconds', function() {
          expect(client.__requestTimeout).to.be(60e3);
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
      async function createClient(opts) {
        const createdClient = new LightClient(opts);
        await createdClient.connect(null, { username: '_ADMIN', password: 'xxx' });
        return createdClient;
      }
    });
  });
});
