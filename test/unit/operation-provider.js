const test = require('../__fixtures/test-helper').create();
var OperationsProvider = require('../../lib/providers/operations-provider');
describe(test.name(__filename, 2), function() {
  this.timeout(10000);
  context('request()', function() {
    it('errors if not connected', function(done) {
      var mockConnection = {
        connected: false
      };

      var o = new OperationsProvider({}, mockConnection, {});
      o.request('component', 'version', 'method', [], function(e) {
        test.expect(e.message).to.be('Not connected');
        o.stop();
        done();
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
      let o;
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
              test.expect(path).to.be('/_exchange/responses/SESSION_ID/*');
              o.stop();
              done();
            } catch (e) {
              o.stop();
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

      o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
    });

    it('subscribes to response path per secure', function(done) {
      let o;
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
              test.expect(path).to.be('/_exchange/responses/SESSION_ID/*');
              o.stop();
              done();
            } catch (e) {
              o.stop();
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

      o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function() {});
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
        test.expect(count).to.be(1);
        o.stop();
        done();
      }, 100);
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
        test.expect(count).to.be(2);
        o.stop();
        done();
      }, 100);
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
          test.expect(e.message).to.equal('xxxx');
          o.stop();
          done();
        } catch (e) {
          done(e);
        }
      });
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

      o.executeRequest = function(implementation, component, version, method, args) {
        try {
          test.expect(implementation).to.eql({ local: true, name: 'MESH_NAME' });
          test.expect(component).to.equal('component');
          test.expect(version).to.equal('version');
          test.expect(method).to.equal('method');
          test.expect(args).to.eql([]);
          o.stop();
          done();
        } catch (e) {
          done(e);
        }
      };

      o.request('component', 'version', 'method', [], function() {});
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
          test.expect(callbacks).to.be(0);
        } catch (e) {
          clearTimeout(timeout2);
          return done(e);
        }
      }, 50);

      var timeout2 = setTimeout(function() {
        try {
          test.expect(callbacks).to.be(2);
          o.stop();
          done();
        } catch (e) {
          return done(e);
        }
      }, 150);
    });
  });

  context('executeRequest()', function() {
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
            test.expect(e.message).to.be('Not connected');
            o.stop();
            done();
          })
          .catch(done);
      });

      it('calls set on request path', function(done) {
        var o = new OperationsProvider({}, mockConnection, mockImplementers);
        mockConnection.client.set = function(path) {
          test.expect(path).to.be('/_exchange/requests/DOMAIN_NAME/component/method');
          o.stop();
          done();
        };
        callbackifyAndBind(o.executeRequest, o)(
          { local: true },
          'component',
          'version',
          'method',
          ['ARGS'],
          function() {},
          e => {
            if (e) return done(e);
          }
        );
      });

      it('calls set with request arguments (secure)', function(done) {
        var o = new OperationsProvider({}, mockConnection, mockImplementers);
        mockConnection.client.set = function(path, data) {
          o.stop();
          test.expect(data).to.eql({
            callbackAddress: '/_exchange/responses/DOMAIN_NAME/component/method/SESSION_ID/1',
            args: [{ params: 1 }],
            origin: {
              id: 'SESSION_ID',
              username: '_ADMIN'
            },
            version: 'version'
          });
          done();
        };
        callbackifyAndBind(o.executeRequest, o)(
          { local: true },
          'component',
          'version',
          'method',
          [{ params: 1 }],
          function() {},
          e => {
            if (e) done(e);
          }
        );
      });

      it('calls set with request arguments (insecure)', function(done) {
        let o;
        mockConnection.client.set = function(path, data) {
          o.stop();
          test.expect(data).to.eql({
            callbackAddress: '/_exchange/responses/SESSION_ID/DOMAIN_NAME/component/method/1',
            args: [{ params: 1 }],
            origin: {
              id: 'SESSION_ID'
            },
            version: 'version'
          });
          done();
        };

        delete mockConnection.client.session.user;
        mockConnection.client.session.happn.secure = false;

        o = new OperationsProvider({}, mockConnection, mockImplementers);

        callbackifyAndBind(o.executeRequest, o)(
          { local: true },
          'component',
          'version',
          'method',
          [{ params: 1 }],
          function() {},
          e => {
            if (e) done(e);
          }
        );
      });

      it('calls set with timeout and noStore options', function(done) {
        const mockHappnerClient = {
          __requestTimeout: 10 * 1000
        };
        const o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);
        mockConnection.client.set = function(path, data, options) {
          o.stop();
          test.expect(options).to.eql({
            timeout: 10 * 1000,
            noStore: true
          });
          done();
        };
        callbackifyAndBind(o.executeRequest, o)(
          { local: true },
          'component',
          'version',
          'method',
          [{ params: 1 }],
          function() {},
          e => {
            if (e) done(e);
          }
        );
      });

      it('rejects on set failure', function(done) {
        mockConnection.client.set = function(path, data, options, callback) {
          callback(new Error('failed to set'));
        };

        var o = new OperationsProvider({}, mockConnection, mockImplementers);

        o.executeRequest({ local: true }, 'component', 'method', [{ params: 1 }], function() {})
          .catch(function(e) {
            test.expect(e.message).to.be('failed to set');
            o.stop();
            done();
          })
          .catch(done);
      });

      it('resolves on set success', function(done) {
        mockConnection.client.set = function(path, data, options, callback) {
          callback(null);
        };

        var o = new OperationsProvider({}, mockConnection, mockImplementers);

        o.executeRequest(
          { local: true },
          'component',
          'version',
          'method',
          [{ params: 1 }],
          function() {}
        )
          .then(function() {
            o.stop();
            done();
          })
          .catch(done);
      });

      it('places callback into reference for reply', function(done) {
        mockConnection.client.set = function(path, data, options, callback) {
          callback(null);
        };

        var mockHappnerClient = {
          __responseTimeout: 100
        };

        var o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);

        callbackifyAndBind(o.executeRequest, o)(
          { local: true },
          'component',
          'version',
          'method',
          [{ params: 1 }],
          function() {},
          function(e) {
            o.stop();
            if (e) return done(e);
            test.expect(o.awaitingResponses).to.have.key('1');
            test.expect(o.awaitingResponses[1]).to.have.key('callback');
            o.stop();
            done();
          }
        );
      });

      it('sets a timeout for reply', function(done) {
        mockConnection.client.set = function(path, data, options, callback) {
          setTimeout(callback, 200);
        };

        var mockHappnerClient = {
          __responseTimeout: 100
        };

        var o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);

        callbackifyAndBind(o.executeRequest, o)(
          { local: true },
          'component',
          'version',
          'method',
          [{ params: 1 }],
          e => {
            o.stop();
            test.expect(e.message).to.equal('Timeout awaiting response');
            done();
          },
          e => {
            if (e) return done(e);
          }
        );
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
      o.stop();
      done();
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
        o.stop();
        done();
      }, 100);
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
      test.expect(o.awaitingResponses[18]).to.be(undefined);
      o.stop();
      done();
    });

    it('calls back on status OK to the waiting caller', function(done) {
      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function(e, param1, param2) {
          test.expect(param1).to.eql({ params: 1 });
          test.expect(param2).to.eql({ params: 2 });
          o.stop();
          done();
        },
        timeout: null
      };

      var testData = { status: 'ok', args: [null, { params: 1 }, { params: 2 }] };
      var testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);
    });

    it('converts error responses to errors on status error', function(done) {
      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function(e) {
          test.expect(e.message).to.equal('xxx');
          test.expect(e.name).to.equal('TypeError');
          o.stop();
          done();
        },
        timeout: null
      };

      var testData = { status: 'error', args: [{ message: 'xxx', name: 'TypeError' }] };
      var testMeta = { path: 'abc/def/ghi/18' };

      o.response(testData, testMeta);
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
          test.expect(path).to.be('/_events/DOMAIN_NAME/componentName/event/name');
          test.expect(parameters).to.eql({
            event_type: 'set',
            meta: {
              componentVersion: '^1.0.0'
            }
          });
          // test.expect(handler).to.be(mockHandler); // proxied, impossible test
          callback();
        }
      };

      o.subscribe(component, version, key, mockHandler, function(e) {
        if (e) return done(e);
        o.stop();
        done();
      });
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
          test.expect(id).to.be('EVENT_ID');
          callback();
        }
      };

      var o = new OperationsProvider({}, mockConnection, {});

      o.unsubscribe('EVENT_ID', function(e) {
        if (e) return done(e);
        o.stop();
        done();
      });
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
          test.expect(path).to.be('/_events/DOMAIN_NAME/component/event/name');
          callback();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementators);

      var component = 'component';
      var key = 'event/name';

      o.unsubscribePath(component, key, function(e) {
        if (e) return done(e);
        o.stop();
        done();
      });
    });
  });
  function callbackifyAndBind(func, obj) {
    return test.util.callbackify(func).bind(obj || func);
  }
});
