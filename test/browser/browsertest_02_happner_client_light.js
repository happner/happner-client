/* eslint-disable no-console */
describe('browsertest_02_happner_client_light', function() {
  // test new client
  let expect = window.expect;
  let client;
  const DOMAIN = 'DOMAIN_NAME';
  this.timeout(100000);

  before('create client', async () => {
    this.timeout(100000);
    client = await createClient({ domain: DOMAIN, secure: true });
  });

  after('stop client', function(done) {
    this.timeout(100000);
    if (!client) return done();
    client.disconnect(done);
  });

  async function delay(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  context('callbacks', function() {
    it('can call a function which returns one argument', function(done) {
      try {
        client.exchange.$call(
          {
            component: 'component1',
            method: 'methodReturningOneArg',
            arguments: ['arg1']
          },
          function(e, result) {
            if (e) return done(e);
            expect(result).to.equal('arg1');
            done();
          }
        );
      } catch (e) {
        done(e);
      }
    });

    it('fails to call a component that does not exist', function(done) {
      client.exchange.$call(
        {
          component: 'nonExistentComponent',
          method: 'methodReturningOneArg',
          arguments: ['arg1']
        },
        function(e) {
          expect(e.message).to.equal(
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
          expect(e.message).to.equal(
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
          expect(result1).to.equal('arg1');
          expect(result2).to.equal('arg2');
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
            expect(e.name).to.equal('Error');
            expect(e.message).to.equal(
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
            expect(e.name).to.equal('Error');
            expect(e.message).to.equal(
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
      expect(results).to.eql('arg1');
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
      expect(error.message).to.equal(errorMessage);
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

  context('timeouts', function() {
    it('checks the default request and response timeouts are 120 seconds', function() {
      expect(client.__requestTimeout).to.equal(60e3);
      expect(client.__responseTimeout).to.equal(120e3);
    });

    it('sets up a client with the request and response timeout that is less then long-running method, the request should time out', async () => {
      const timeoutClient = await createClient({
        domain: DOMAIN,
        requestTimeout: 5e3,
        responseTimeout: 5e3
      });
      expect(timeoutClient.__requestTimeout).to.equal(5e3);
      expect(timeoutClient.__responseTimeout).to.equal(5e3);
      let errorMessage;
      try {
        await timeoutClient.exchange.$call({
          component: 'component1',
          method: 'methodThatTimesOut'
        });
      } catch (e) {
        errorMessage = e.message;
      }
      expect(errorMessage).to.equal('Timeout awaiting response');
      timeoutClient.disconnect(() => {
        //do nothing
      });
    });
  });

  context('events - promises', function() {
    it('we are able to call component methods and listen to events', async () => {
      let results = await callAndListen(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' }
      );
      expect(results).to.eql({
        event: { DATA: 1 },
        exec: null
      });
    });

    it('we are able to call component methods and listen to events using $once', async () => {
      let eventCounter = await callAndListenOnce(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' }
      );
      expect(eventCounter).to.eql(1);
    });

    it('we are able to call component methods and listen to events using $once - negative', async () => {
      let eventCounter = await callAndListenOnce(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' },
        true
      );
      expect(eventCounter).to.eql(3);
    });

    it('we are able to call component methods and listen to events with an $off', async () => {
      let eventCounter = await callAndListenOff(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' }
      );
      expect(eventCounter).to.eql(3);
    });

    it('we are able to call component methods and listen to events with an $off - negative test', async () => {
      let eventCounter = await callAndListenOff(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' },
        true
      );
      expect(eventCounter).to.eql(4);
    });

    it('we are able to call component methods and listen to events with an $offPath', async () => {
      let eventCounter = await callAndListenOffPath(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' }
      );
      expect(eventCounter).to.eql(2);
    });

    it('we are able to call component methods and listen to events with an $offPath - negative test', async () => {
      let eventCounter = await callAndListenOffPath(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' },
        true
      );
      expect(eventCounter).to.eql(4);
    });
  });

  context('events - callbacks', function() {
    it('we are able to call component methods and listen to events - with callback', function(done) {
      callAndListenCallback(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' },
        (e, results) => {
          if (e) return done(e);
          expect(results).to.eql({
            event: { DATA: 1 },
            exec: null
          });
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events using $once - with callback', function(done) {
      callAndListenOnceCallback(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' },
        (e, results) => {
          if (e) return done(e);
          expect(results).to.eql(1);
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events with an $off - with callback', function(done) {
      callAndListenOffCallback(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' },
        false,
        (e, results) => {
          if (e) return done(e);
          expect(results).to.eql(3);
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events with an $off - with callback - negative test', function(done) {
      callAndListenOffCallback(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' },
        true,
        (e, results) => {
          if (e) return done(e);
          expect(results).to.eql(4);
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events with an $offPath - with callback', function(done) {
      callAndListenOffPathCallback(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { component: 'component1', path: 'test/event' },
        false,
        (e, results) => {
          if (e) return done(e);
          expect(results).to.eql(2);
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events with an $offPath - with callback - negative test', function(done) {
      callAndListenOffPathCallback(
        client,
        {
          component: 'component1',
          method: 'exec',
          arguments: ['test/event']
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        true,
        (e, results) => {
          if (e) return done(e);
          expect(results).to.eql(4);
          done();
        }
      );
    });
  });

  async function callAndListen(client, callParameters, listenParameters) {
    let results = {};
    await client.event.$on(listenParameters, function(data) {
      results.event = data;
    });
    results.exec = await client.exchange.$call(callParameters);
    await delay(2000);
    return results;
  }

  async function callAndListenOnce(client, callParameters, listenParameters, negative) {
    let eventCounter = 0;
    if (!negative) {
      await client.event.$once(listenParameters, function() {
        eventCounter++;
      });
    } else {
      await client.event.$on(listenParameters, function() {
        eventCounter++;
      });
    }

    await client.exchange.$call(callParameters);
    await client.exchange.$call(callParameters);
    await client.exchange.$call(callParameters);
    await delay(2000);
    return eventCounter;
  }

  async function callAndListenOff(client, callParameters, listenParameters, negative) {
    let eventCounter = 0;
    const id = await client.event.$on(listenParameters, function() {
      eventCounter++;
    });
    await client.event.$on(listenParameters, function() {
      eventCounter++;
    });
    await client.exchange.$call(callParameters);
    if (!negative) await client.event.$off(id);
    await client.exchange.$call(callParameters);
    await delay(2000);
    return eventCounter;
  }

  async function callAndListenOffPath(client, callParameters, listenParameters, negative) {
    let eventCounter = 0;
    await client.event.$on(listenParameters, function() {
      eventCounter++;
    });
    await client.event.$on(listenParameters, function() {
      eventCounter++;
    });
    await client.exchange.$call(callParameters);
    if (!negative) await client.event.$offPath(listenParameters);
    await client.exchange.$call(callParameters);
    await delay(2000);
    return eventCounter;
  }

  function callAndListenCallback(client, callParameters, listenParameters, callback) {
    let results = {};
    client.event.$on(
      listenParameters,
      function(data) {
        results.event = data;
      },
      e => {
        if (e) return callback(e);
        client.exchange.$call(callParameters, (e, result) => {
          if (e) return callback(e);
          results.exec = result;
          setTimeout(() => {
            callback(null, results);
          }, 2000);
        });
      }
    );
  }

  function callAndListenOnceCallback(client, callParameters, listenParameters, callback) {
    let eventCounter = 0;
    client.event.$once(
      listenParameters,
      function() {
        eventCounter++;
      },
      e => {
        if (e) return callback(e);
        client.exchange.$call(callParameters, e => {
          if (e) return callback(e);
          client.exchange.$call(callParameters, e => {
            if (e) return callback(e);
            client.exchange.$call(callParameters, e => {
              if (e) return callback(e);
              setTimeout(() => {
                callback(null, eventCounter);
              }, 2000);
            });
          });
        });
      }
    );
  }

  function callAndListenOffCallback(client, callParameters, listenParameters, negative, callback) {
    let eventCounter = 0;
    let id;

    let finishCallback = () => {
      client.exchange.$call(callParameters, e => {
        if (e) return callback(e);
        setTimeout(() => {
          callback(null, eventCounter);
        }, 2000);
      });
    };

    client.event.$on(
      listenParameters,
      function() {
        eventCounter++;
      },
      (e, eventId) => {
        if (e) return callback(e);
        id = eventId;
        client.event.$on(
          listenParameters,
          function() {
            eventCounter++;
          },
          e => {
            if (e) return callback(e);
            client.exchange.$call(callParameters, e => {
              if (e) return callback(e);
              if (negative) return finishCallback();
              return client.event.$off(id, e => {
                if (e) return callback(e);
                finishCallback();
              });
            });
          }
        );
      }
    );
  }

  function callAndListenOffPathCallback(
    client,
    callParameters,
    listenParameters,
    negative,
    callback
  ) {
    let eventCounter = 0;
    let finishCallback = () => {
      client.exchange.$call(callParameters, e => {
        if (e) return callback(e);
        setTimeout(() => {
          callback(null, eventCounter);
        }, 2000);
      });
    };
    client.event.$on(
      listenParameters,
      function() {
        eventCounter++;
      },
      e => {
        if (e) return callback(e);
        client.event.$on(
          listenParameters,
          function() {
            eventCounter++;
          },
          e => {
            if (e) return callback(e);
            client.exchange.$call(callParameters, e => {
              if (e) return callback(e);
              if (negative) return finishCallback();
              client.event.$offPath(listenParameters, e => {
                if (e) return callback(e);
                finishCallback();
              });
            });
          }
        );
      }
    );
  }

  async function createClient(opts) {
    const createdClient = new Happner.LightHappnerClient(opts);
    await createdClient.connect(null, { username: '_ADMIN', password: 'xxx' });
    return createdClient;
  }
});
