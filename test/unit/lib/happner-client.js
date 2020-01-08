const expect = require('expect.js');

const HappnerClient = require('../../..');

const testHelper = require('../../__fixtures/test-helper');
const OperationsProvider = require('../../../lib/providers/operations-provider');
const ImplementorsProvider = require('../../../lib/providers/implementors-provider');
const EventEmitter = require('events').EventEmitter;

const why = require('why-is-node-running');

describe(testHelper.testName(__filename, 4), function() {
  // for future use incase of leaks
  // after(function() {
  //   why();
  // });
  var mockOrchestrator;
  var subscriptions;

  beforeEach(function() {
    subscriptions = {};
    mockOrchestrator = {
      peers: {},
      on: function(event) {
        subscriptions[event] = 1;
      }
    };
  });

  it('subscribes to peer add and remove', function(done) {
    var c = new HappnerClient();

    c.mount(mockOrchestrator);
    expect(subscriptions).to.eql({
      'peer/add': 1,
      'peer/remove': 1
    });

    c.disconnect(done);
  });

  beforeEach(function() {
    this.originalRequest = OperationsProvider.prototype.request;
    this.originalSubscribe = OperationsProvider.prototype.subscribe;
    this.originalUnsubscribe = OperationsProvider.prototype.unsubscribe;
    this.originalUnsubscribePath = OperationsProvider.prototype.unsubscribePath;
  });

  afterEach(function() {
    OperationsProvider.prototype.request = this.originalRequest;
    OperationsProvider.prototype.subscribe = this.originalSubscribe;
    OperationsProvider.prototype.unsubscribe = this.originalUnsubscribe;
    OperationsProvider.prototype.unsubscribePath = this.originalUnsubscribePath;
  });

  it('errors on model without version declared', function(done) {
    var model = {
      component1: {
        // version: '^1.0.0',
        methods: {
          method1: {},
          method2: {}
        }
      }
    };

    var c = new HappnerClient();

    try {
      c.construct(model);
    } catch (e) {
      expect(e.message).to.be('Missing version');
      c.disconnect(done);
    }
  });

  context('exchange', function() {
    it('builds exchange functions from model', function(done) {
      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {},
            method2: {}
          }
        },
        component2: {
          version: '^1.0.0',
          methods: {
            method1: {},
            method2: {}
          }
        }
      };

      var c = new HappnerClient();

      var api = c.construct(model);

      expect(api.exchange.component1.method1).to.be.a(Function);
      expect(api.exchange.component1.method2).to.be.a(Function);
      expect(api.exchange.component2.method1).to.be.a(Function);
      expect(api.exchange.component2.method2).to.be.a(Function);
      c.disconnect(done);
    });

    it('calls operations provider on calls to exchange functions', function(done) {
      OperationsProvider.prototype.request = function(component, version, method) {
        try {
          expect(component).to.be('component1');
          expect(version).to.be('^1.0.0');
          expect(method).to.be('method1');
          c.disconnect(done);
        } catch (e) {
          done(e);
        }
      };

      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {},
            method2: {}
          }
        }
      };

      var c = new HappnerClient();
      var api = c.construct(model);

      api.exchange.component1.method1();
    });

    it('supports promises on exchange calls', function(done) {
      OperationsProvider.prototype.request = function(component, version, method, args, callback) {
        callback(null, { RE: 'SULT' });
      };

      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      var c = new HappnerClient();
      var api = c.construct(model);

      api.exchange.component1.method1('ARG1').then(function(result) {
        expect(result).to.eql({ RE: 'SULT' });
      });
      c.disconnect(done);
    });

    it('supports callbacks on exchange calls', function(done) {
      OperationsProvider.prototype.request = function(component, version, method, args, callback) {
        callback(null, { RE: 'SULT' });
      };

      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      var c = new HappnerClient();
      var api = c.construct(model);

      api.exchange.component1.method1('ARG1', function(e, result) {
        if (e) return done(e);
        expect(result).to.eql({ RE: 'SULT' });
        c.disconnect(done);
      });
    });

    it('amends existing happner object where component undefined', function(done) {
      OperationsProvider.prototype.request = function(component, version, method, args, callback) {
        callback(null, { RE: 'SULT' });
      };

      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        },
        component2: {
          version: '^2.0.0',
          methods: {
            method1: {}
          }
        }
      };

      var c = new HappnerClient();
      var happner = {
        exchange: {
          component2: {
            __version: '2.0.1',
            method1: function(callback) {
              callback(null, 'existing component');
            }
          }
        },
        event: {}
      };

      c.construct(model, happner);

      happner.exchange.component2.method1(function(e, result) {
        expect(result).to.be('existing component');

        happner.exchange.component1.method1('ARG1', function(e, result) {
          if (e) return done(e);
          expect(result).to.eql({ RE: 'SULT' });
          c.disconnect(done);
        });
      });
    });

    it('amends existing happner object where component wrong version', function(done) {
      OperationsProvider.prototype.request = function(component, version, method, args, callback) {
        callback(null, { RE: 'SULT' });
      };

      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        },
        component2: {
          version: '^3.0.0',
          methods: {
            method1: {}
          }
        }
      };

      var c = new HappnerClient();
      var happner = {
        exchange: {
          component2: {
            __version: '2.0.1', // <----------- wrong version, gets replaced
            method1: function(callback) {
              callback(null, 'existing component');
            }
          }
        },
        event: {}
      };

      c.construct(model, happner);

      happner.exchange.component2.method1(function(e, result) {
        expect(result).to.not.be('existing component');
        expect(result).to.eql({ RE: 'SULT' });

        happner.exchange.component1.method1('ARG1', function(e, result) {
          if (e) return done(e);
          expect(result).to.eql({ RE: 'SULT' });
          c.disconnect(done);
        });
      });
    });
  });

  context('event', function() {
    it('builds on, off and offPath', function(done) {
      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {},
            method2: {}
          }
        },
        component2: {
          version: '^1.0.0',
          methods: {
            method1: {},
            method2: {}
          }
        }
      };

      var c = new HappnerClient();

      var api = c.construct(model);

      expect(api.event.component1.on).to.be.a(Function);
      expect(api.event.component1.off).to.be.a(Function);
      expect(api.event.component1.offPath).to.be.a(Function);
      expect(api.event.component2.on).to.be.a(Function);
      expect(api.event.component2.off).to.be.a(Function);
      expect(api.event.component2.offPath).to.be.a(Function);
      c.disconnect(done);
    });

    it('can subscribe to an event without callback', function(done) {
      var eventHandler = function() {};

      OperationsProvider.prototype.subscribe = function(
        component,
        version,
        key,
        handler,
        callback
      ) {
        expect(component).to.be('component1');
        expect(version).to.be('^1.0.0');
        expect(key).to.be('event/xx');
        expect(handler).to.be(eventHandler);
        callback();
        c.disconnect(done);
      };

      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      var c = new HappnerClient();
      var api = c.construct(model);

      api.event.component1.on('event/xx', eventHandler);
    });

    it('can subscribe to an event with callback', function(done) {
      var eventHandler = function() {};

      OperationsProvider.prototype.subscribe = function(
        component,
        version,
        key,
        handler,
        callback
      ) {
        expect(component).to.be('component1');
        expect(version).to.be('^1.0.0');
        expect(key).to.be('event/xx');
        expect(handler).to.be(eventHandler);
        callback(new Error('xxxx'));
      };

      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      var c = new HappnerClient();
      var api = c.construct(model);

      api.event.component1.on('event/xx', eventHandler, function(e) {
        expect(e.message).to.be('xxxx');
        c.disconnect(done);
      });
    });

    it('can unsubscribe (off)', function(done) {
      OperationsProvider.prototype.unsubscribe = function(id, callback) {
        expect(id).to.be('ID');
        callback(new Error('xxxx'));
      };

      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      var c = new HappnerClient();
      var api = c.construct(model);

      api.event.component1.off('ID', function(e) {
        expect(e.message).to.be('xxxx');
        c.disconnect(done);
      });
    });

    it('can unsubscribe (offPath)', function(done) {
      OperationsProvider.prototype.unsubscribePath = function(componentName, key, callback) {
        expect(componentName).to.be('component1');
        expect(key).to.be('event/xx');
        callback(new Error('xxxx'));
      };

      var model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      var c = new HappnerClient();
      var api = c.construct(model);

      api.event.component1.offPath('event/xx', function(e) {
        expect(e.message).to.be('xxxx');
        c.disconnect(done);
      });
    });

    it('adds happner event api where component undefined', function(done) {
      var count = 0;
      OperationsProvider.prototype.subscribe = function(
        component,
        version,
        key,
        handler,
        callback
      ) {
        count++;
        callback();
      };

      var model = {
        component1: {
          // component1 gets amended onto $happner
          version: '^1.0.0'
        },
        component2: {
          // component2 already exists in $happner but is replaced with version aware subscriber
          version: '^2.0.0'
        }
      };

      var happner = {
        exchange: {},
        event: {
          component2: {
            on: function() {}
          }
        }
      };

      var c = new HappnerClient();
      c.construct(model, happner);

      // both subscriptions should call subscribe stub that increments count
      happner.event.component1.on('event/xx', function() {});
      happner.event.component2.on('event/yy', function() {});

      expect(count).to.be(2);
      c.disconnect(done);
    });
  });

  context('data', function() {
    it('');
  });

  context('request()', function() {
    it('errors if not connected', function(done) {
      var mockConnection = {
        connected: false
      };

      var o = new OperationsProvider({}, mockConnection, {});
      o.request('component', 'version', 'method', [], function(e) {
        expect(e.message).to.be('Not connected');
        done();
        o.stop();
      });
    });

    it('calls getDescriptions', function(done) {
      var mockConnection = {
        connected: true
      };

      var mockImplementors = {
        getDescriptions: function() {
          return {
            // return mock promise
            then: function() {
              done();
              return {
                catch: function() {}
              };
            }
          };
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.stop();
    });

    it('calls getImplementation', function(done) {
      var mockConnection = {
        connected: true
      };

      var mockImplementors = {
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return {
            // return mock promise
            then: function() {
              done();
              return {
                catch: function() {}
              };
            }
          };
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.stop();
    });

    it('subscribes to response path per insecure', function(done) {
      var mockConnection = {
        connected: true,
        client: {
          session: {
            id: 'SESSION_ID',
            happn: {
              secure: false
            }
          },
          on: function(path) {
            try {
              expect(path).to.be('/_exchange/responses/SESSION_ID/*');
              done();
            } catch (e) {
              done(e);
            }
          }
        }
      };

      var mockImplementors = {
        sessionId: 'SESSION_ID',
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.stop();
    });

    it('subscribes to response path per secure', function(done) {
      var mockConnection = {
        connected: true,
        client: {
          session: {
            id: 'SESSION_ID',
            happn: {
              secure: false
            }
          },
          on: function(path) {
            try {
              expect(path).to.be('/_exchange/responses/SESSION_ID/*');
              done();
            } catch (e) {
              done(e);
            }
          }
        }
      };

      var mockImplementors = {
        sessionId: 'SESSION_ID',
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.stop();
    });

    it('subscribes to insecure response path only once', function(done) {
      var count = 0;

      var mockConnection = {
        connected: true,
        client: {
          session: {
            id: 'SESSION_ID',
            happn: {
              secure: false
            }
          },
          on: function() {
            count++;
          }
        }
      };

      var mockImplementors = {
        domain: 'DOMAIN_NAME',
        secure: false,
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.request('component', 'version', 'method', [], function() {});
      o.request('component2', 'version', 'method', [], function() {});

      setTimeout(function() {
        expect(count).to.be(1);
        done();
      }, 100);
      o.stop();
    });

    it('subscribes to each secure response path only once', function(done) {
      var count = 0;

      var mockConnection = {
        connected: true,
        client: {
          session: {
            id: 'SESSION_ID',
            happn: {
              secure: true
            }
          },
          on: function() {
            count++;
          }
        }
      };

      var mockImplementors = {
        domain: 'DOMAIN_NAME',
        sessionId: 'SESSION_ID',
        secure: true,
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.request('component', 'version', 'method', [], function() {});
      o.request('component2', 'version', 'method', [], function() {});

      setTimeout(function() {
        expect(count).to.be(2);
        done();
      }, 100);
      o.stop();
    });

    it('errors if subscribe to response path fails', function(done) {
      var mockConnection = {
        connected: true,
        client: {
          session: {
            id: 'SESSION_ID',
            happn: {
              secure: true
            }
          },
          on: function(path, options, handler, callback) {
            callback(new Error('xxxx'));
          }
        }
      };

      var mockImplementors = {
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function(e) {
        try {
          expect(e.message).to.equal('xxxx');
          done();
        } catch (e) {
          done(e);
        }
      });
      o.stop();
    });

    it('calls executeRequest', function(done) {
      var mockConnection = {
        connected: true
      };

      var mockImplementors = {
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve({ local: true, name: 'MESH_NAME' });
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);

      o.subscribeToResponsePaths = function() {
        return Promise.resolve();
      };

      o.executeRequest = function(implementation, component, method, args) {
        try {
          expect(implementation).to.eql({ local: true, name: 'MESH_NAME' });
          expect(component).to.equal('component');
          expect(method).to.equal('method');
          expect(args).to.eql([]);
          done();
        } catch (e) {
          done(e);
        }
      };

      o.request('component', 'version', 'method', [], function() {});
      o.stop();
    });
  });

  context('subscribeToResponsePaths()', function() {
    it('does not resolve on second call to subscribe while first call is still pending', function(done) {
      var callbacks = 0;

      var mockConnection = {
        connected: true,
        client: {
          session: {
            id: 'SESSION_ID',
            happn: {
              secure: true
            }
          },
          on: function(path, options, handler, callback) {
            setTimeout(function() {
              callback();
            }, 100);
          }
        }
      };

      var mockImplementors = {
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.subscribeToResponsePaths('component', 'method')
        .then(function() {
          callbacks++;
        })
        .catch(done);

      o.subscribeToResponsePaths('component', 'method')
        .then(function() {
          callbacks++;
        })
        .catch(done);

      setTimeout(function() {
        try {
          expect(callbacks).to.be(0);
        } catch (e) {
          clearTimeout(timeout2);
          return done(e);
        }
      }, 50);

      var timeout2 = setTimeout(function() {
        try {
          expect(callbacks).to.be(2);
          done();
        } catch (e) {
          return done(e);
        }
      }, 150);
      o.stop();
    });
  });

  context('executeRequest()', function() {
    context('on cluster', function() {
      it('handles concurrently departed peer');

      it('retries if called peer departed');
    });

    context('on local', function() {
      var mockConnection, mockImplementers;

      beforeEach(function() {
        mockConnection = {
          connected: true,
          client: {
            session: {
              id: 'SESSION_ID',
              happn: {
                secure: true
              },
              user: {
                username: '_ADMIN'
              }
            },
            set: function() {}
          }
        };

        mockImplementers = {
          domain: 'DOMAIN_NAME'
        };
      });

      it('rejects on not connected', function(done) {
        mockConnection.connected = false;

        var o = new OperationsProvider({}, mockConnection, mockImplementers);

        o.executeRequest({ local: true }, 'component', 'method', ['ARGS'], function() {})
          .catch(function(e) {
            expect(e.message).to.be('Not connected');
            done();
          })
          .catch(done);
        o.stop();
      });

      it('calls set on request path', function(done) {
        mockConnection.client.set = function(path) {
          expect(path).to.be('/_exchange/requests/DOMAIN_NAME/component/method');
          done();
        };

        var o = new OperationsProvider({}, mockConnection, mockImplementers);

        o.executeRequest({ local: true }, 'component', 'method', ['ARGS'], function() {}).catch(
          done
        );
        o.stop();
      });

      it('calls set with request arguments (secure)', function(done) {
        mockConnection.client.set = function(path, data) {
          expect(data).to.eql({
            callbackAddress: '/_exchange/responses/DOMAIN_NAME/component/method/SESSION_ID/1',
            args: [{ params: 1 }],
            origin: {
              id: 'SESSION_ID',
              username: '_ADMIN'
            }
          });
          done();
        };

        var o = new OperationsProvider({}, mockConnection, mockImplementers);

        o.executeRequest(
          { local: true },
          'component',
          'method',
          [{ params: 1 }],
          function() {}
        ).catch(done);
        o.stop();
      });

      it('calls set with request arguments (insecure)', function(done) {
        mockConnection.client.set = function(path, data) {
          expect(data).to.eql({
            callbackAddress: '/_exchange/responses/SESSION_ID/DOMAIN_NAME/component/method/1',
            args: [{ params: 1 }],
            origin: {
              id: 'SESSION_ID'
            }
          });
          done();
        };

        delete mockConnection.client.session.user;
        mockConnection.client.session.happn.secure = false;

        var o = new OperationsProvider({}, mockConnection, mockImplementers);

        o.executeRequest(
          { local: true },
          'component',
          'method',
          [{ params: 1 }],
          function() {}
        ).catch(done);
        o.stop();
      });

      it('calls set with timeout and noStore options', function(done) {
        mockConnection.client.set = function(path, data, options) {
          expect(options).to.eql({
            timeout: 10 * 1000,
            noStore: true
          });
          done();
        };

        var mockHappnerClient = {
          __requestTimeout: 10 * 1000
        };

        var o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);

        o.executeRequest(
          { local: true },
          'component',
          'method',
          [{ params: 1 }],
          function() {}
        ).catch(done);
        o.stop();
      });

      it('rejects on set failure', function(done) {
        mockConnection.client.set = function(path, data, options, callback) {
          callback(new Error('failed to set'));
        };

        var o = new OperationsProvider({}, mockConnection, mockImplementers);

        o.executeRequest({ local: true }, 'component', 'method', [{ params: 1 }], function() {})
          .catch(function(e) {
            expect(e.message).to.be('failed to set');
            done();
          })
          .catch(done);
        o.stop();
      });

      it('resolves on set success', function(done) {
        mockConnection.client.set = function(path, data, options, callback) {
          callback(null);
        };

        var o = new OperationsProvider({}, mockConnection, mockImplementers);

        o.executeRequest({ local: true }, 'component', 'method', [{ params: 1 }], function() {})
          .then(function() {
            done();
          })
          .catch(done);
        o.stop();
      });

      it('places callback into reference for reply', function(done) {
        mockConnection.client.set = function(path, data, options, callback) {
          callback(null);
        };

        var mockHappnerClient = {
          __responseTimeout: 100
        };

        var o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);

        o.executeRequest({ local: true }, 'component', 'method', [{ params: 1 }], function() {})
          .then(function() {
            expect(o.awaitingResponses).to.have.key('1');
            expect(o.awaitingResponses[1]).to.have.key('callback');
            done();
          })
          .catch(done);
        o.stop();
      });

      it('sets a timeout for reply', function(done) {
        mockConnection.client.set = function(path, data, options, callback) {
          callback(null);
        };

        var mockHappnerClient = {
          __responseTimeout: 100
        };

        var o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);

        o.executeRequest({ local: true }, 'component', 'method', [{ params: 1 }], function(e) {
          expect(e.message).to.equal('Timeout awaiting response');
          done();
        });
        o.stop();
      });
    });
  });

  context('response()', function() {
    // sample response data:
    // non-error: {status: 'ok', args: [null, {params: 1}]}
    // error: {status: 'error', args: [{message: 'xxx', name: 'Error'}]}

    it('handles no such waiting caller', function(done) {
      var o = new OperationsProvider({}, {}, {});

      var testData = { status: 'ok', args: [null, { params: 1 }] };
      var testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);

      done();
      o.stop();
    });

    it('clears the request timeout', function(done) {
      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function() {},
        timeout: setTimeout(function() {
          clearTimeout(passTimeout);
          done(new Error('Should not time out'));
        }, 50)
      };

      var testData = { status: 'ok', args: [null, { params: 1 }] };
      var testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);

      var passTimeout = setTimeout(function() {
        done();
      }, 100);
      o.stop();
    });

    it('deletes the awaiting response', function(done) {
      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function() {},
        timeout: null
      };

      var testData = { status: 'ok', args: [null, { params: 1 }] };
      var testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);
      expect(o.awaitingResponses[18]).to.be(undefined);
      done();
      o.stop();
    });

    it('calls back on status OK to the waiting caller', function(done) {
      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function(e, param1, param2) {
          expect(param1).to.eql({ params: 1 });
          expect(param2).to.eql({ params: 2 });
          done();
        },
        timeout: null
      };

      var testData = { status: 'ok', args: [null, { params: 1 }, { params: 2 }] };
      var testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);
      o.stop();
    });

    it('converts error responses to errors on status error', function(done) {
      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function(e) {
          expect(e.message).to.equal('xxx');
          expect(e.name).to.equal('TypeError');
          done();
        },
        timeout: null
      };

      var testData = { status: 'error', args: [{ message: 'xxx', name: 'TypeError' }] };
      var testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);
      o.stop();
    });
  });

  context('subscribe()', function() {
    var mockConnection, mockImplementators;

    before(function() {
      mockConnection = {
        connected: true
      };

      mockImplementators = {
        getDescriptions: function() {
          this.domain = 'DOMAIN_NAME';
          return Promise.resolve();
        }
      };
    });

    it('does the subscribe on correct path and options', function(done) {
      var o = new OperationsProvider({}, mockConnection, mockImplementators);

      var component = 'componentName';
      var version = '^1.0.0';
      var key = 'event/name';
      var mockHandler = function() {};

      mockConnection.client = {
        on: function(path, parameters, handler, callback) {
          expect(path).to.be('/_events/DOMAIN_NAME/componentName/event/name');
          expect(parameters).to.eql({
            event_type: 'set',
            meta: {
              componentVersion: '^1.0.0'
            }
          });
          // expect(handler).to.be(mockHandler); // proxied, impossible test
          callback();
        }
      };

      o.subscribe(component, version, key, mockHandler, function(e) {
        if (e) return done(e);
        done();
      });
      o.stop();
    });
  });

  context('unsubscribe()', function() {
    var mockConnection;

    before(function() {
      mockConnection = {
        connected: true
      };
    });

    it('unsubscribes with id', function(done) {
      mockConnection.client = {
        off: function(id, callback) {
          expect(id).to.be('EVENT_ID');
          callback();
        }
      };

      var o = new OperationsProvider({}, mockConnection, {});

      o.unsubscribe('EVENT_ID', function(e) {
        if (e) return done(e);
        done();
      });
      o.stop();
    });
  });

  context('unsubscribePath()', function() {
    var mockConnection, mockImplementators;

    before(function() {
      mockConnection = {
        connected: true
      };

      mockImplementators = {
        getDescriptions: function() {
          this.domain = 'DOMAIN_NAME';
          return Promise.resolve();
        }
      };
    });

    it('does the unsubscribe on correct path', function(done) {
      mockConnection.client = {
        offPath: function(path, callback) {
          expect(path).to.be('/_events/DOMAIN_NAME/component/event/name');
          callback();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementators);

      var component = 'component';
      var key = 'event/name';

      o.unsubscribePath(component, key, function(e) {
        if (e) return done(e);
        done();
      });
      o.stop();
    });
  });

  var mockClient;

  beforeEach(function() {
    mockClient = {
      on: function() {}
    };
  });

  context('getDescriptions()', function() {
    var mockConnection;

    beforeEach(function() {
      mockConnection = {
        connected: true,
        client: {
          session: {
            happn: {
              name: 'SERVER_NAME',
              secure: false
            }
          },
          get: function(path, callback) {
            callback(null, {});
          }
        }
      };
    });

    it('gets the description on first call', function(done) {
      mockConnection.client.get = function(path) {
        try {
          expect(path).to.be('/mesh/schema/description');
          done();
        } catch (e) {
          done(e);
        }
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);
      i.getDescriptions();
    });

    it('keeps getting description until description.initializing is false', function(done) {
      this.timeout(3500);

      var count = 0;

      var descriptions = [
        {
          initializing: true
        },
        {
          initializing: true
        },
        {
          initializing: false
        },
        {
          initializing: false
        }
      ];

      mockConnection.client.get = function(path, callback) {
        count++;
        callback(null, descriptions.shift());
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);
      i.getDescriptions();

      setTimeout(function() {
        expect(count).to.be(3);
        done();
      }, 3100);
    });

    it('resolves after description arrives for subsequent calls', function(done) {
      var count = 0;

      mockConnection.client.get = function(path, callback) {
        count++;
        setTimeout(function() {
          callback(null, {
            initializing: false
          });
        }, 100);
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);
      i.getDescriptions();
      i.getDescriptions()
        .then(function() {
          expect(count).to.be(1);
        })
        .then(done)
        .catch(done);
    });

    it('resolves immediately if got description already', function(done) {
      mockConnection.client.get = function(path, callback) {
        callback(null, {
          initializing: false
        });
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);
      i.getDescriptions()
        .then(function() {
          mockConnection.client.get = function() {
            done(new Error('should not get again'));
          };

          return i.getDescriptions();
        })
        .then(function() {
          done();
        });
    });

    it('sets domain', function(done) {
      mockConnection.client.get = function(path, callback) {
        callback(null, {
          initializing: false,
          name: 'DOMAIN_NAME'
        });
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);

      i.getDescriptions()
        .then(function() {
          expect(i.domain).to.be('DOMAIN_NAME');
        })
        .then(done)
        .catch(done);
    });

    it('can get descriptions from a list of peers', function(done) {
      delete mockConnection.client;

      mockConnection.clients = {
        peers: {
          NAME_0: {
            self: true,
            client: {
              session: {
                happn: {
                  name: 'SERVER_0'
                }
              },
              get: function(path, callback) {
                callback(null, {
                  initializing: false,
                  name: 'DOMAIN_NAME'
                });
              }
            }
          },
          NAME_1: {
            self: false,
            client: {
              session: {
                happn: {
                  name: 'SERVER_1'
                }
              },
              get: function(path, callback) {
                callback(null, {
                  initializing: false,
                  name: 'DOMAIN_NAME'
                });
              }
            }
          },
          NAME_2: {
            self: false,
            client: {
              session: {
                happn: {
                  name: 'SERVER_2'
                }
              },
              get: function(path, callback) {
                callback(null, {
                  initializing: false,
                  name: 'DOMAIN_NAME'
                });
              }
            }
          }
        }
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);

      i.getDescriptions()
        .then(function() {
          expect(i.descriptions).to.eql([
            {
              initializing: false,
              name: 'DOMAIN_NAME',
              self: false,
              meshName: 'SERVER_1',
              url: null
            },
            {
              initializing: false,
              name: 'DOMAIN_NAME',
              self: false,
              meshName: 'SERVER_2',
              url: null
            }
          ]);
        })
        .then(done)
        .catch(done);
    });
  });

  context('getNextImplementation()', function() {
    it('reject if no description', function(done) {
      var i = new ImplementorsProvider(mockClient, {});

      i.getNextImplementation('component', 'version', 'method')
        .catch(function(e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);
    });

    it('resolves if already mapped', function(done) {
      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{}];
      i.maps['component/version/method'] = [{ local: true }];

      i.getNextImplementation('component', 'version', 'method')
        .then(function(result) {
          expect(result).to.eql({ local: true });
        })
        .then(done)
        .catch(done);
    });

    it('resolves in round robin', function(done) {
      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{}];
      i.maps['component/version/method'] = [
        { local: true },
        { local: false, name: 'peer1' },
        { local: false, name: 'peer2' }
      ];

      i.getNextImplementation('component', 'version', 'method')
        .then(function(result) {
          expect(result).to.eql({ local: true });
          return i.getNextImplementation('component', 'version', 'method');
        })
        .then(function(result) {
          expect(result).to.eql({ local: false, name: 'peer1' });
          return i.getNextImplementation('component', 'version', 'method');
        })
        .then(function(result) {
          expect(result).to.eql({ local: false, name: 'peer2' });
          return i.getNextImplementation('component', 'version', 'method');
        })
        .then(function(result) {
          expect(result).to.eql({ local: true });
        })
        .then(done)
        .catch(done);
    });

    it('creates the implementation map just-in-time', function(done) {
      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [
        {
          meshName: 'SERVER_2',
          self: true,
          components: {
            component1: {
              name: 'component1',
              version: '1.2.4',
              methods: {
                method1: {}
              }
            }
          }
        }
      ];

      i.getNextImplementation('component1', '^1.0.0', 'method1')
        .then(function(result) {
          expect(result).to.eql({
            local: true,
            name: 'SERVER_2'
          });
          done();
        })
        .catch(done);
    });

    it('remembers when method not implemented (empty array)', function(done) {
      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{}];
      i.maps['component/version/method'] = [];

      i.getNextImplementation('component', 'version', 'method')
        .catch(function(e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);
    });

    it('rejects if not implemented component', function(done) {
      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [
        {
          components: {}
        }
      ];

      i.getNextImplementation('component', 'version', 'method')
        .catch(function(e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);
    });

    it('rejects if not implemented version', function(done) {
      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [
        {
          components: {
            component1: {
              name: 'component1',
              version: '2.1.4',
              methods: {
                method1: {}
              }
            }
          }
        }
      ];

      i.getNextImplementation('component1', '^1.0.0', 'method1')
        .catch(function(e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);
    });

    it('rejects if not implemented method', function(done) {
      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [
        {
          components: {
            component1: {
              name: 'component1',
              version: '1.1.4',
              methods: {
                method1: {}
              }
            }
          }
        }
      ];

      i.getNextImplementation('component1', '^1.0.0', 'method2')
        .catch(function(e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);
    });

    it('destroys all maps on reconnect', function(done) {
      var i;

      mockClient = {
        on: function(event, handler) {
          expect(event).to.be('reconnected');
          setTimeout(function() {
            handler();

            expect(i.maps).to.eql({});
            done();
          }, 200);
        }
      };

      i = new ImplementorsProvider(mockClient, {});
      i.maps = 'EXISTING';
    });

    it('destroys all descriptions on reconnect', function(done) {
      var i;

      mockClient = {
        on: function(event, handler) {
          expect(event).to.be('reconnected');
          setTimeout(function() {
            handler();

            expect(i.descriptions).to.eql([]);
            done();
          }, 200);
        }
      };

      i = new ImplementorsProvider(mockClient, {});
      i.descriptions = 'EXISTING';
    });
  });

  context('removePeer()', function() {
    var mockClient;

    beforeEach(function() {
      mockClient = {
        on: function() {},
        emit: function() {}
      };
    });

    it('removes implementations and description on peer departure', function(done) {
      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [
        {
          meshName: 'MESH_2'
        },
        {
          meshName: 'MESH_3'
        },
        {
          meshName: 'MESH_4'
        }
      ];

      i.maps = {
        'remoteComponent3/^1.0.0/method1': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_3' },
          { local: false, name: 'MESH_4' }
        ],
        'remoteComponent3/^1.0.0/method2': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_3' },
          { local: false, name: 'MESH_4' }
        ]
      };

      i.removePeer('MESH_3');

      expect(i.descriptions).to.eql([
        {
          meshName: 'MESH_2'
        },
        {
          meshName: 'MESH_4'
        }
      ]);

      expect(i.maps).to.eql({
        'remoteComponent3/^1.0.0/method1': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_4' }
        ],
        'remoteComponent3/^1.0.0/method2': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_4' }
        ]
      });

      done();
    });
  });

  context('addPeer()', function() {
    var mockClient, mockConnection;

    beforeEach(function() {
      mockClient = {
        on: function() {},
        emit: function() {}
      };

      mockConnection = {
        clients: {
          peers: {
            NAME: {
              self: false,
              client: {
                session: {
                  happn: {
                    name: 'NAME',
                    secure: false
                  },
                  id: 'SESSION_ID'
                },
                get: function(path, callback) {
                  if (path !== '/mesh/schema/description') return;
                  callback(null, {
                    name: 'DOMAIN_NAME',
                    initializing: false,
                    components: {
                      component2: {
                        name: 'component2',
                        version: '1.3.1',
                        methods: {
                          method1: {},
                          method2: {}
                        }
                      },
                      component3: {
                        name: 'component3',
                        version: '1.30.324',
                        methods: {
                          method1: {},
                          method2: {}
                        }
                      }
                    }
                  });
                }
              }
            }
          }
        }
      };
    });

    it('adds implementations and description on peer arrival', function(done) {
      var i = new ImplementorsProvider(mockClient, mockConnection);

      i.maps = {
        'component1/^1.0.0/method1': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_3' },
          { local: false, name: 'MESH_4' }
        ],
        'component2/^1.0.0/method2': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_3' },
          { local: false, name: 'MESH_4' }
        ],
        'component3/^2.0.0/method1': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_3' },
          { local: false, name: 'MESH_4' }
        ]
      };
      i.descriptions = [];

      i.addPeer('NAME');

      expect(i.maps).to.eql({
        'component1/^1.0.0/method1': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_3' },
          { local: false, name: 'MESH_4' }
        ],
        'component2/^1.0.0/method2': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_3' },
          { local: false, name: 'MESH_4' },
          { local: false, name: 'NAME' }
        ],
        'component3/^2.0.0/method1': [
          { local: false, name: 'MESH_2' },
          { local: false, name: 'MESH_3' },
          { local: false, name: 'MESH_4' }
        ]
      });
      expect(i.descriptions.length).to.equal(1);
      done();
    });
  });

  var mockClient;

  beforeEach(function() {
    mockClient = new EventEmitter();
  });

  var mockConnection;

  beforeEach(function() {
    mockConnection = {
      connected: true,
      client: {
        session: {
          happn: {
            name: 'SERVER_NAME',
            secure: false
          }
        },
        get: function(path, callback) {
          callback(null, {});
        }
      }
    };
  });

  it('tests the __getUpdatedDependencyDescription method', function() {
    var i = new ImplementorsProvider(mockClient, mockConnection);

    let descriptions1 = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];

    expect(i.__getUpdatedDependencyDescription(descriptions1, 'component1', '^1.1.0')).to.eql(
      descriptions1[0]
    );

    let descriptions2 = [
      {
        components: {
          component2: {
            version: '1.1.0'
          }
        }
      }
    ];

    expect(i.__getUpdatedDependencyDescription(descriptions2, 'component1', '^1.1.0')).to.eql(
      undefined
    );

    let descriptions3 = {
      components: {
        component2: {
          version: '1.1.0'
        }
      }
    };

    expect(i.__getUpdatedDependencyDescription(descriptions3, 'component2', '^1.1.0')).to.eql(
      descriptions3
    );

    let descriptions4 = {
      components: {
        component5: {
          version: '1.1.0'
        }
      }
    };

    expect(i.__getUpdatedDependencyDescription(descriptions4, 'component1', '^1.1.0')).to.eql(
      undefined
    );
  });

  it('emits the peer/arrived/description event', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {},
      warn: function() {}
    };

    var testDescriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];

    i.descriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];

    i.gotDescriptions = true;

    i.happnerClient.on('peer/arrived/description', function(whatChanged) {
      expect(whatChanged).to.eql({
        dependorName: 'test1',
        countMatches: 1,
        componentName: 'component1',
        version: '^1.0.0',
        description: {
          version: '1.1.0'
        },
        url: undefined,
        meshName: undefined
      });
      done();
    });

    i.dependencies = {
      test1: {
        component1: '^1.0.0',
        component2: '1.0.0'
      },
      test2: {
        component21: '2.0.0',
        component22: '2.0.0'
      }
    };

    i.logDependenciesMet(testDescriptions);
  });
});
