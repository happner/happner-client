var expect = require('expect.js');
var Promise = require('bluebird');

var OperationsProvider = require('../lib/providers/operations-provider');
// var ConnectionProvider = require('../lib/providers/connection-provider');
// var ImplementorsProvider = require('../lib/providers/implementors-provider');

describe('04 - unit - operation provider', function () {

  context('request()', function () {

    it('errors if not connected', function (done) {

      var mockConnection = {
        connected: false
      };

      var o = new OperationsProvider({}, mockConnection, {});
      o.request('component', 'version', 'method', [], function (e) {

        expect(e.message).to.be('Not connected');
        done();

      });

    });

    it('calls getDescriptions', function (done) {

      var mockConnection = {
        connected: true
      };

      var mockImplementors = {
        getDescriptions: function () {
          return { // return mock promise
            then: function () {
              done();
              return {
                catch: function () {
                }
              }
            }
          }
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function () {
      });

    });

    it('calls getImplementation', function (done) {

      var mockConnection = {
        connected: true
      };

      var mockImplementors = {
        getDescriptions: function () {
          return Promise.resolve();
        },
        getNextImplementation: function () {
          return { // return mock promise
            then: function () {
              done();
              return {
                catch: function () {
                }
              }
            }
          }
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function () {
      });

    });

    it('subscribes to response path per insecure', function (done) {

      var mockConnection = {
        connected: true,
        client: {
          session: {
            id: 'SESSION_ID',
            happn: {
              secure: false
            }
          },
          on: function (path, handler, callback) {
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
        getDescriptions: function () {
          return Promise.resolve();
        },
        getNextImplementation: function () {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function () {
      });

    });

    it('subscribes to response path per secure', function (done) {

      var mockConnection = {
        connected: true,
        client: {
          session: {
            id: 'SESSION_ID',
            happn: {
              secure: false
            }
          },
          on: function (path, handler, callback) {
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
        getDescriptions: function () {
          return Promise.resolve();
        },
        getNextImplementation: function () {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function () {
      });

    });

    it('subscribes to insecure response path only once', function (done) {

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
          on: function (path, handler, callback) {
            count++;
          }
        }
      };

      var mockImplementors = {
        getDescriptions: function () {
          return Promise.resolve();
        },
        getNextImplementation: function () {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function () {
      });
      o.request('component', 'version', 'method', [], function () {
      });
      o.request('component2', 'version', 'method', [], function () {
      });

      setTimeout(function () {
        expect(count).to.be(1);
        done();
      }, 100);

    });

    it('subscribes to each secure response path only once', function (done) {

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
          on: function (path, handler, callback) {
            count++;
          }
        }
      };

      var mockImplementors = {
        getDescriptions: function () {
          return Promise.resolve();
        },
        getNextImplementation: function () {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function () {
      });
      o.request('component', 'version', 'method', [], function () {
      });
      o.request('component2', 'version', 'method', [], function () {
      });

      setTimeout(function () {
        expect(count).to.be(2);
        done();
      }, 100);
    });

    it('errors if subscribe to response path fails', function (done) {

      var mockConnection = {
        connected: true,
        client: {
          session: {
            id: 'SESSION_ID',
            happn: {
              secure: true
            }
          },
          on: function (path, handler, callback) {
            callback(new Error('xxxx'));
          }
        }
      };

      var mockImplementors = {
        getDescriptions: function () {
          return Promise.resolve();
        },
        getNextImplementation: function () {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.request('component', 'version', 'method', [], function (e) {
        try {
          expect(e.message).to.equal('xxxx');
          done();
        } catch (e) {
          done(e);
        }
      });

    });

    it('calls executeRequest', function (done) {

      var mockConnection = {
        connected: true
      };

      var mockImplementors = {
        getDescriptions: function () {
          return Promise.resolve();
        },
        getNextImplementation: function () {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);

      o.subscribeToResponsePaths = function () {
        return Promise.resolve();
      };

      o.executeRequest = function (component, method, args, callback) {
        expect(component).to.equal('component');
        expect(method).to.equal('method');
        expect(args).to.eql([]);
        done();
      };

      o.request('component', 'version', 'method', [], function (e) {

      });

    });

  });

  context('subscribeToResponsePaths()', function () {

    it('does not resolve on second call to subscribe while first call is still pending', function (done) {

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
          on: function (path, handler, callback) {
            setTimeout(function () {
              callback();
            }, 100);
          }
        }
      };

      var mockImplementors = {
        getDescriptions: function () {
          return Promise.resolve();
        },
        getNextImplementation: function () {
          return Promise.resolve();
        }
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementors);
      o.subscribeToResponsePaths('component', 'method')
        .then(function () {
          callbacks++;
        })
        .catch(done);

      o.subscribeToResponsePaths('component', 'method')
        .then(function () {
          callbacks++;
        })
        .catch(done);

      var timeout1 = setTimeout(function () {
        try {
          expect(callbacks).to.be(0);
        } catch (e) {
          clearTimeout(timeout2);
          return done(e);
        }
      }, 50);

      var timeout2 = setTimeout(function () {
        try {
          expect(callbacks).to.be(2);
          done();
        } catch (e) {
          return done(e);
        }
      }, 150);

    });

  });

  context('executeRequest()', function () {

    var mockConnection, mockImplementers;

    beforeEach(function () {

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
          set: function (path, data, options, callback) {

          }
        }
      };

      mockImplementers = {
        domain: 'DOMAIN_NAME'
      }

    });

    it('rejects on not connected', function (done) {

      mockConnection.connected = false;

      var o = new OperationsProvider({}, mockConnection, mockImplementers);

      o.executeRequest('component', 'method', ['ARGS'], function () {
        })
        .catch(function (e) {
          expect(e.message).to.be('Not connected');
          done();
        })
        .catch(done);

    });

    it('calls set on request path', function (done) {

      mockConnection.client.set = function (path, data, options, callback) {
        expect(path).to.be('/_exchange/requests/DOMAIN_NAME/component/method');
        done();
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementers);

      o.executeRequest('component', 'method', ['ARGS'], function () {
        })
        .catch(done);

    });

    it('calls set with request arguments (secure)', function (done) {

      mockConnection.client.set = function (path, data, options, callback) {
        expect(data).to.eql({
          callbackAddress: '/_exchange/responses/DOMAIN_NAME/component/method/SESSION_ID/1',
          args: [
            {params: 1}
          ],
          origin: {
            id: 'SESSION_ID',
            username: '_ADMIN'
          }
        });
        done();
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementers);

      o.executeRequest('component', 'method', [{params: 1}], function () {
        })
        .catch(done);

    });

    it('calls set with request arguments (insecure)', function (done) {

      mockConnection.client.set = function (path, data, options, callback) {
        expect(data).to.eql({
          callbackAddress: '/_exchange/responses/SESSION_ID/DOMAIN_NAME/component/method/1',
          args: [
            {params: 1}
          ],
          origin: {
            id: 'SESSION_ID'
          }
        });
        done();
      };

      delete mockConnection.client.session.user;
      mockConnection.client.session.happn.secure = false;

      var o = new OperationsProvider({}, mockConnection, mockImplementers);

      o.executeRequest('component', 'method', [{params: 1}], function () {
        })
        .catch(done);

    });

    it('calls set with timeout and noStore options', function (done) {

      mockConnection.client.set = function (path, data, options, callback) {
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

      o.executeRequest('component', 'method', [{params: 1}], function () {
        })
        .catch(done);

    });

    it('rejects on set failure', function (done) {

      mockConnection.client.set = function (path, data, options, callback) {
        callback(new Error('failed to set'));
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementers);

      o.executeRequest('component', 'method', [{params: 1}], function () {
        })
        .catch(function (e) {
          expect(e.message).to.be('failed to set');
          done();
        })
        .catch(done);

    });

    it('resolves on set success', function (done) {

      mockConnection.client.set = function (path, data, options, callback) {
        callback(null);
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementers);

      o.executeRequest('component', 'method', [{params: 1}], function () {
        })
        .then(function () {
          done();
        })
        .catch(done);

    });

    it('places callback into reference for reply', function (done) {

      mockConnection.client.set = function (path, data, options, callback) {
        callback(null);
      };

      var o = new OperationsProvider({}, mockConnection, mockImplementers);

      o.executeRequest('component', 'method', [{params: 1}], function () {
        })
        .then(function () {
          expect(o.awaitingResponses).to.have.key('1');
          expect(o.awaitingResponses[1]).to.have.key('callback');
          done();
        })
        .catch(done);

    });

    it('sets a timeout for reply', function (done) {

      mockConnection.client.set = function (path, data, options, callback) {
        callback(null);
      };

      var mockHappnerClient = {
        __responseTimeout: 100
      };

      var o = new OperationsProvider(mockHappnerClient, mockConnection, mockImplementers);

      o.executeRequest('component', 'method', [{params: 1}], function (e) {

        expect(e.message).to.equal('Timeout awaiting response');
        done();

      });

    });

  });

  context('response()', function () {

    // sample response data:
    // non-error: {status: 'ok', args: [null, {params: 1}]}
    // error: {status: 'error', args: [{message: 'xxx', name: 'Error'}]}

    it('handles no such waiting caller', function (done) {

      var o = new OperationsProvider({}, {}, {});

      var testData = {status: 'ok', args: [null, {params: 1}]};
      var testMeta = {path: 'abc/def/ghi/18'};

      o.response(testData, testMeta);

      done();
    });

    it('clears the request timeout', function (done) {

      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function () {
        },
        timeout: setTimeout(function () {
          clearTimeout(passTimeout);
          done(new Error('Should not time out'));
        }, 50)
      };

      var testData = {status: 'ok', args: [null, {params: 1}]};
      var testMeta = {path: 'abc/def/ghi/18'};

      o.response(testData, testMeta);

      var passTimeout = setTimeout(function () {
        done();
      }, 100);

    });

    it('deletes the awaiting response', function (done) {

      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function () {
        },
        timeout: null
      };

      var testData = {status: 'ok', args: [null, {params: 1}]};
      var testMeta = {path: 'abc/def/ghi/18'};

      o.response(testData, testMeta);
      expect(o.awaitingResponses[18]).to.be(undefined);
      done();
    });

    it('calls back on status OK to the waiting caller', function(done){

      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function (e, param1, param2) {
          expect(param1).to.eql({params: 1});
          expect(param2).to.eql({params: 2});
          done();
        },
        timeout: null
      };

      var testData = {status: 'ok', args: [null, {params: 1}, {params: 2}]};
      var testMeta = {path: 'abc/def/ghi/18'};

      o.response(testData, testMeta);

    });

    it('converts error responses to errors on status error', function(done){
      var o = new OperationsProvider({}, {}, {});

      o.awaitingResponses[18] = {
        callback: function (e) {
          expect(e.message).to.equal('xxx');
          expect(e.name).to.equal('TypeError');
          done();
        },
        timeout: null
      };

      var testData = {status: 'error', args: [{message: 'xxx', name: 'TypeError'}]};
      var testMeta = {path: 'abc/def/ghi/18'};

      o.response(testData, testMeta);
    });

  })

});
