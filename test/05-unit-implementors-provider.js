var expect = require('expect.js');

var ImplementorsProvider = require('../lib/providers/implementors-provider');

describe('05 - unit - implementors provider', function () {

  var mockClient;

  beforeEach(function () {
    mockClient = {
      on: function () {
      }
    };
  });

  context('getDescriptions()', function () {

    var mockConnection;

    beforeEach(function () {
      mockConnection = {
        connected: true,
        client: {
          session: {
            happn: {
              name: 'SERVER_NAME',
              secure: false
            }
          },
          get: function (path, callback) {
            callback(null, {});
          }
        }
      };
    });

    it('gets the description on first call', function (done) {

      mockConnection.client.get = function (path, callback) {
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

    it('keeps getting description until description.initializing is false', function (done) {

      this.timeout(3500);

      var count = 0;

      var descriptions = [
        {
          initializing: true
        }, {
          initializing: true
        }, {
          initializing: false
        }, {
          initializing: false
        }
      ];

      mockConnection.client.get = function (path, callback) {
        count++;
        callback(null, descriptions.shift());
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);
      i.getDescriptions();

      setTimeout(function () {
        expect(count).to.be(3);
        done();
      }, 3100);

    });

    it('resolves after description arrives for subsequent calls', function (done) {

      var count = 0;

      mockConnection.client.get = function (path, callback) {
        count++;
        setTimeout(function () {
          callback(null, {
            initializing: false
          });
        }, 100);
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);
      i.getDescriptions();
      i.getDescriptions().then(function () {
        expect(count).to.be(1);
      }).then(done).catch(done);

    });

    it('resolves immediately if got description already', function (done) {

      mockConnection.client.get = function (path, callback) {
        callback(null, {
          initializing: false
        });
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);
      i.getDescriptions()
        .then(function () {
          mockConnection.client.get = function (path, callback) {
            done(new Error('should not get again'));
          };

          return i.getDescriptions()
        })
        .then(function () {
          done();
        });
    });

    it('sets domain', function (done) {

      mockConnection.client.get = function (path, callback) {
        callback(null, {
          initializing: false,
          name: 'DOMAIN_NAME'
        });
      };

      var i = new ImplementorsProvider(mockClient, mockConnection);

      i.getDescriptions()
        .then(function () {
          expect(i.domain).to.be('DOMAIN_NAME');
        })
        .then(done).catch(done);
    });

    it('can get descriptions from a list of peers', function (done) {

      delete mockConnection.client;

      mockConnection.clients = {
        peers: {
          'NAME_0': {
            self: true,
            client: {
              session: {
                happn: {
                  name: 'SERVER_0'
                }
              },
              get: function (path, callback) {
                callback(null, {
                  initializing: false,
                  name: 'DOMAIN_NAME'
                });
              }
            }
          },
          'NAME_1': {
            self: false,
            client: {
              session: {
                happn: {
                  name: 'SERVER_1'
                }
              },
              get: function (path, callback) {
                callback(null, {
                  initializing: false,
                  name: 'DOMAIN_NAME'
                });
              }
            }
          },
          'NAME_2': {
            self: false,
            client: {
              session: {
                happn: {
                  name: 'SERVER_2'
                }
              },
              get: function (path, callback) {
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
        .then(function () {
          expect(i.descriptions).to.eql([
            {
              initializing: false,
              name: 'DOMAIN_NAME',
              self: false,
              meshName: 'SERVER_1',
              url:null
            },
            {
              initializing: false,
              name: 'DOMAIN_NAME',
              self: false,
              meshName: 'SERVER_2',
              url:null
            }
          ]);
        })
        .then(done).catch(done);
    });
  });

  context('getNextImplementation()', function () {

    it('reject if no description', function (done) {

      var i = new ImplementorsProvider(mockClient, {});

      i.getNextImplementation('component', 'version', 'method')
        .catch(function (e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);

    });

    it('resolves if already mapped', function (done) {

      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{}];
      i.maps['component/version/method'] = [{local: true}];

      i.getNextImplementation('component', 'version', 'method')
        .then(function (result) {
          expect(result).to.eql({local: true});
        })
        .then(done).catch(done);

    });

    it('resolves in round robin', function (done) {

      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{}];
      i.maps['component/version/method'] = [
        {local: true},
        {local: false, name: 'peer1'},
        {local: false, name: 'peer2'}
      ];

      i.getNextImplementation('component', 'version', 'method')
        .then(function (result) {
          expect(result).to.eql({local: true});
          return i.getNextImplementation('component', 'version', 'method');
        })
        .then(function (result) {
          expect(result).to.eql({local: false, name: 'peer1'});
          return i.getNextImplementation('component', 'version', 'method');
        })
        .then(function (result) {
          expect(result).to.eql({local: false, name: 'peer2'});
          return i.getNextImplementation('component', 'version', 'method');
        })
        .then(function (result) {
          expect(result).to.eql({local: true});
        })
        .then(done).catch(done);

    });

    it('creates the implementation map just-in-time', function (done) {

      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{
        meshName: 'SERVER_2',
        self: true,
        components: {
          component1: {
            name: 'component1',
            version: '1.2.4',
            methods: {
              'method1': {}
            }
          }
        }
      }];

      i.getNextImplementation('component1', '^1.0.0', 'method1')
        .then(function (result) {
          expect(result).to.eql({
            local: true,
            name: 'SERVER_2'
          });
          done();
        })
        .catch(done);

    });

    it('remembers when method not implemented (empty array)', function (done) {

      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{}];
      i.maps['component/version/method'] = [];

      i.getNextImplementation('component', 'version', 'method')
        .catch(function (e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);

    });

    it('rejects if not implemented component', function (done) {

      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{
        components: {}
      }];

      i.getNextImplementation('component', 'version', 'method')
        .catch(function (e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);

    });

    it('rejects if not implemented version', function (done) {

      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{
        components: {
          component1: {
            name: 'component1',
            version: '2.1.4',
            methods: {
              'method1': {}
            }
          }
        }
      }];

      i.getNextImplementation('component1', '^1.0.0', 'method1')
        .catch(function (e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);

    });

    it('rejects if not implemented method', function (done) {

      var i = new ImplementorsProvider(mockClient, {});

      i.descriptions = [{
        components: {
          component1: {
            name: 'component1',
            version: '1.1.4',
            methods: {
              'method1': {}
            }
          }
        }
      }];

      i.getNextImplementation('component1', '^1.0.0', 'method2')
        .catch(function (e) {
          expect(e.message).to.match(/^Not implemented/);
          done();
        })
        .catch(done);

    });

    it('destroys all maps on reconnect', function (done) {

      var i;

      mockClient = {
        on: function (event, handler) {
          expect(event).to.be('reconnected');
          setTimeout(function () {
            handler();

            expect(i.maps).to.eql({});
            done();

          }, 200);
        }
      };

      i = new ImplementorsProvider(mockClient, {});
      i.maps = 'EXISTING';

    });

    it('destroys all descriptions on reconnect', function (done) {

      var i;

      mockClient = {
        on: function (event, handler) {
          expect(event).to.be('reconnected');
          setTimeout(function () {
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

  context('removePeer()', function () {

    var mockClient;

    beforeEach(function () {
      mockClient = {
        on: function (event, handler) {},
        emit:function(){}
      };
    });

    it('removes implementations and description on peer departure', function (done) {

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
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_3'},
          {local: false, name: 'MESH_4'}
        ],
        'remoteComponent3/^1.0.0/method2': [
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_3'},
          {local: false, name: 'MESH_4'}
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
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_4'}
        ],
        'remoteComponent3/^1.0.0/method2': [
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_4'}
        ]
      });

      done();
    });
  });

  context('addPeer()', function () {

    var mockClient, mockConnection;

    beforeEach(function () {
      mockClient = {
        on: function (event, handler) {},
        emit: function(){}
      };

      mockConnection = {
        clients: {
          peers: {
            'NAME': {
              self: false,
              client: {
                session: {
                  happn: {
                    name: 'NAME',
                    secure: false
                  },
                  id: 'SESSION_ID'
                },
                get: function (path, callback) {
                  if (path != '/mesh/schema/description') return;
                  callback(null, {
                    "name": "DOMAIN_NAME",
                    "initializing": false,
                    "components": {
                      "component2": {
                        "name": "component2",
                        "version": "1.3.1",
                        "methods": {
                          "method1": {},
                          "method2": {}
                        }
                      },
                      "component3": {
                        "name": "component3",
                        "version": "1.30.324",
                        "methods": {
                          "method1": {},
                          "method2": {}
                        }
                      }
                    }
                  });
                }
              }
            }
          }
        }
      }
    });

    it('adds implementations and description on peer arrival', function (done) {

      var i = new ImplementorsProvider(mockClient, mockConnection);

      i.maps = {
        'component1/^1.0.0/method1': [
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_3'},
          {local: false, name: 'MESH_4'}
        ],
        'component2/^1.0.0/method2': [
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_3'},
          {local: false, name: 'MESH_4'}
        ],
        'component3/^2.0.0/method1': [
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_3'},
          {local: false, name: 'MESH_4'}
        ],
      };
      i.descriptions = [];

      i.addPeer('NAME');

      expect(i.maps).to.eql({
        'component1/^1.0.0/method1': [
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_3'},
          {local: false, name: 'MESH_4'}
        ],
        'component2/^1.0.0/method2': [
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_3'},
          {local: false, name: 'MESH_4'},
          {local: false, name: 'NAME'}
        ],
        'component3/^2.0.0/method1': [
          {local: false, name: 'MESH_2'},
          {local: false, name: 'MESH_3'},
          {local: false, name: 'MESH_4'}
        ]
      });
      expect(i.descriptions.length).to.equal(1);
      done();
    });
  });
});
