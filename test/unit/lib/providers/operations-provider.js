const expect = require('expect.js');
const Promise = require('bluebird');
const OperationsProvider = require('../../../../lib/providers/operations-provider');
const HappnerClient = require('../../../..');

const testHelper = require('../../../__fixtures/test-helper');

describe(testHelper.testName(__filename, 4), function() {
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
    let model = {
      component1: {
        // version: '^1.0.0',
        methods: {
          method1: {},
          method2: {}
        }
      }
    };

    let c = new HappnerClient();

    try {
      c.construct(model);
    } catch (e) {
      expect(e.message).to.be('Missing version');
      c.disconnect(done);
    }
  });

  context('exchange', function() {
    it('builds exchange functions from model', function(done) {
      let model = {
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

      let c = new HappnerClient();

      let api = c.construct(model);

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

      let model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {},
            method2: {}
          }
        }
      };

      let c = new HappnerClient();
      let api = c.construct(model);

      api.exchange.component1.method1();
    });

    it('supports promises on exchange calls', function(done) {
      OperationsProvider.prototype.request = function(component, version, method, args, callback) {
        callback(null, { RE: 'SULT' });
      };

      let model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      let c = new HappnerClient();
      let api = c.construct(model);

      api.exchange.component1.method1('ARG1').then(function(result) {
        expect(result).to.eql({ RE: 'SULT' });
      });
      c.disconnect(done);
    });

    it('supports callbacks on exchange calls', function(done) {
      OperationsProvider.prototype.request = function(component, version, method, args, callback) {
        callback(null, { RE: 'SULT' });
      };

      let model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      let c = new HappnerClient();
      let api = c.construct(model);

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

      let model = {
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

      let c = new HappnerClient();
      let happner = {
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

      let model = {
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

      let c = new HappnerClient();
      let happner = {
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
      let model = {
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

      let c = new HappnerClient();

      let api = c.construct(model);

      expect(api.event.component1.on).to.be.a(Function);
      expect(api.event.component1.off).to.be.a(Function);
      expect(api.event.component1.offPath).to.be.a(Function);
      expect(api.event.component2.on).to.be.a(Function);
      expect(api.event.component2.off).to.be.a(Function);
      expect(api.event.component2.offPath).to.be.a(Function);
      c.disconnect(done);
    });

    it('can subscribe to an event without callback', function(done) {
      let eventHandler = function() {};

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

      let model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      let c = new HappnerClient();
      let api = c.construct(model);

      api.event.component1.on('event/xx', eventHandler);
    });

    it('can subscribe to an event with callback', function(done) {
      let eventHandler = function() {};

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

      let model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      let c = new HappnerClient();
      let api = c.construct(model);

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

      let model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      let c = new HappnerClient();
      let api = c.construct(model);

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

      let model = {
        component1: {
          version: '^1.0.0',
          methods: {
            method1: {}
          }
        }
      };

      let c = new HappnerClient();
      let api = c.construct(model);

      api.event.component1.offPath('event/xx', function(e) {
        expect(e.message).to.be('xxxx');
        c.disconnect(done);
      });
    });

    it('adds happner event api where component undefined', function(done) {
      let count = 0;
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

      let model = {
        component1: {
          // component1 gets amended onto $happner
          version: '^1.0.0'
        },
        component2: {
          // component2 already exists in $happner but is replaced with version aware subscriber
          version: '^2.0.0'
        }
      };

      let happner = {
        exchange: {},
        event: {
          component2: {
            on: function() {}
          }
        }
      };

      let c = new HappnerClient();
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
      let mockConnection = {
        connected: false
      };

      let o = new OperationsProvider({}, mockConnection, {});
      o.request('component', 'version', 'method', [], function(e) {
        expect(e.message).to.be('Not connected');
        done();
        o.stop();
      });
    });

    it('calls getDescriptions', function(done) {
      let mockConnection = {
        connected: true
      };

      let mockImplementors = {
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

      let o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.stop();
    });

    it('calls getImplementation', function(done) {
      let mockConnection = {
        connected: true
      };

      let mockImplementors = {
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

      let o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.stop();
    });

    it('subscribes to response path per insecure', function(done) {
      let mockConnection = {
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

      let mockImplementors = {
        sessionId: 'SESSION_ID',
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      let o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.stop();
    });

    it('subscribes to response path per secure', function(done) {
      let mockConnection = {
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

      let mockImplementors = {
        sessionId: 'SESSION_ID',
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      let o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
      o.stop();
    });

    it('subscribes to insecure response path only once', function(done) {
      let count = 0;

      let mockConnection = {
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

      let mockImplementors = {
        domain: 'DOMAIN_NAME',
        secure: false,
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      let o = new OperationsProvider({}, mockConnection, mockImplementors);
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
      let count = 0;

      let mockConnection = {
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

      let mockImplementors = {
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

      let o = new OperationsProvider({}, mockConnection, mockImplementors);
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
      let mockConnection = {
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

      let mockImplementors = {
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      let o = new OperationsProvider({}, mockConnection, mockImplementors);
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
      let mockConnection = {
        connected: true
      };

      let mockImplementors = {
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve({ local: true, name: 'MESH_NAME' });
        }
      };

      let o = new OperationsProvider({}, mockConnection, mockImplementors);

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
      let callbacks = 0;

      let mockConnection = {
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

      let mockImplementors = {
        getDescriptions: function() {
          return Promise.resolve();
        },
        getNextImplementation: function() {
          return Promise.resolve();
        }
      };

      let o = new OperationsProvider({}, mockConnection, mockImplementors);
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

      let timeout2 = setTimeout(function() {
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
      let mockConnection, mockImplementers;

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

        let o = new OperationsProvider({}, mockConnection, mockImplementers);

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

        let o = new OperationsProvider({}, mockConnection, mockImplementers);

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

        let o = new OperationsProvider({}, mockConnection, mockImplementers);

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

        let o = new OperationsProvider({}, mockConnection, mockImplementers);

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

        let mockHappnerClient = {
          __requestTimeout: 10 * 1000
        };

        let o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);

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

        let o = new OperationsProvider({}, mockConnection, mockImplementers);

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

        let o = new OperationsProvider({}, mockConnection, mockImplementers);

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

        let mockHappnerClient = {
          __responseTimeout: 100
        };

        let o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);

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

        let mockHappnerClient = {
          __responseTimeout: 100
        };

        let o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);

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
      let o = new OperationsProvider({}, {}, {});

      let testData = { status: 'ok', args: [null, { params: 1 }] };
      let testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);

      done();
      o.stop();
    });

    it('clears the request timeout', function(done) {
      let o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function() {},
        timeout: setTimeout(function() {
          clearTimeout(passTimeout);
          done(new Error('Should not time out'));
        }, 50)
      };

      let testData = { status: 'ok', args: [null, { params: 1 }] };
      let testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);

      let passTimeout = setTimeout(function() {
        done();
      }, 100);
      o.stop();
    });

    it('deletes the awaiting response', function(done) {
      let o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function() {},
        timeout: null
      };

      let testData = { status: 'ok', args: [null, { params: 1 }] };
      let testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);
      expect(o.awaitingResponses[18]).to.be(undefined);
      done();
      o.stop();
    });

    it('calls back on status OK to the waiting caller', function(done) {
      let o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function(e, param1, param2) {
          expect(param1).to.eql({ params: 1 });
          expect(param2).to.eql({ params: 2 });
          done();
        },
        timeout: null
      };

      let testData = { status: 'ok', args: [null, { params: 1 }, { params: 2 }] };
      let testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);
      o.stop();
    });

    it('converts error responses to errors on status error', function(done) {
      let o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function(e) {
          expect(e.message).to.equal('xxx');
          expect(e.name).to.equal('TypeError');
          done();
        },
        timeout: null
      };

      let testData = { status: 'error', args: [{ message: 'xxx', name: 'TypeError' }] };
      let testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);
      o.stop();
    });
  });

  context('subscribe()', function() {
    let mockConnection, mockImplementators;

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
      let o = new OperationsProvider({}, mockConnection, mockImplementators);

      let component = 'componentName';
      let version = '^1.0.0';
      let key = 'event/name';
      let mockHandler = function() {};

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
    let mockConnection;

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

      let o = new OperationsProvider({}, mockConnection, {});

      o.unsubscribe('EVENT_ID', function(e) {
        if (e) return done(e);
        done();
      });
      o.stop();
    });
  });

  context('unsubscribePath()', function() {
    let mockConnection, mockImplementators;

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

      let o = new OperationsProvider({}, mockConnection, mockImplementators);

      let component = 'component';
      let key = 'event/name';

      o.unsubscribePath(component, key, function(e) {
        if (e) return done(e);
        done();
      });
      o.stop();
    });
  });
});
