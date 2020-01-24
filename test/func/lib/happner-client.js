const path = require('path');
const expect = require('expect.js');
const testHelper = require('../../__fixtures/test-helper');
const Happner = require('happner-2');
const HappnerClient = require('../../..');
// const why = require('why-is-node-running');
// const delay = require('await-delay');

const certPath = path.dirname(__dirname) + path.sep + 'example.com.cert';
const keyPath = path.dirname(__dirname) + path.sep + 'example.com.key';

const fixturesPath = path.resolve(__dirname, '../../__fixtures');

const componentPaths = {
  component1: fixturesPath + '/21-component-1/index.js',
  component2: fixturesPath + '/21-component-2/index.js',
  component3: fixturesPath + '/22-component-1/index.js',
  component4: fixturesPath + '/22-component-2/index.js',
  component5: fixturesPath + '/23-component-1/index.js'
};

const { component1, component2, component3, component4, component5 } = componentPaths;

describe(testHelper.testName(__filename, 4), function() {
  this.timeout(10000);
  // for future use incase of leaks
  // after(async () => {
  //   await delay(5000);
  //   why();
  // });
  let server;

  function startServer(done) {
    if (server) return done();
    Happner.create({
      util: {
        logLevel: process.env.LOG_LEVEL || 'warn'
      },
      happn: {
        secure: true,
        adminPassword: 'xxx',
        services: {
          transport: {
            config: {
              mode: 'https',
              certPath: certPath,
              keyPath: keyPath
            }
          }
        }
      }
    })
      .then(function(_server) {
        server = _server;
      })
      .then(done)
      .catch(done);
  }

  function stopServer(done) {
    if (!server) return done();
    server.stop(function(e) {
      server = undefined;
      done(e);
    });
  }

  function stopServerDisconnect(reconnect, done) {
    if (typeof reconnect === 'function') {
      done = reconnect;
      reconnect = false;
    }

    if (!server) return done();
    server.stop({ reconnect }, function(e) {
      server = undefined;
      done(e);
    });
  }

  beforeEach('start server', startServer);

  afterEach('stop server disconnect', stopServer);

  it('supports callback', function(done) {
    let c = new HappnerClient();
    c.connect(
      {
        // config: {
        host: 'localhost',
        port: 55000
        // }
      },
      {
        username: '_ADMIN',
        password: 'xxx',
        info: 'fo',
        protocol: 'https',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);
        c.disconnect(done);
      }
    );
  });

  it('supports promise', function(done) {
    let c = new HappnerClient();
    c.on('error', function() {});
    c.connect(
      {
        host: '127.0.0.1',
        port: 9999 // <------------------- intentionally wrong
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      }
    )
      .catch(function(e) {
        expect(e.code).to.be('ECONNREFUSED');
      })
      .then(function() {
        c.disconnect(done);
      })
      .catch(function(e) {
        c.disconnect(function() {});
        done(e);
      });
  });

  it('defaults', function(done) {
    // inherits happn defaulting
    let c = new HappnerClient();
    c.connect(
      {
        // host: 'localhost',
        // port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);
        c.disconnect(done);
      }
    );
  });

  it('emits connected on connect', function(done) {
    let c = new HappnerClient();
    c.on('connected', function() {
      c.disconnect(done);
    });
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function() {}
    );
  });

  it('emits disconnected on normal disconnect', function(done) {
    let c = new HappnerClient();
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);

        c.on('disconnected', function() {
          c.disconnect(function(e) {
            setTimeout(function() {
              // wait for server to finish stopping before next test
              // so that beforeHook knows to restart it
              if (e) return done(e);
              done();
            }, 200);
          });
        });

        stopServerDisconnect(function(e) {
          if (e) return done(e);
        });
      }
    );
  });

  //Leak here
  it('emits disconnected even if server was stopped with reconnect true', function(done) {
    let c = new HappnerClient();
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);

        c.on('disconnected', function() {
          c.disconnect(function(e) {
            // FAILING: happn-3/issues/13
            // disconnect does not callback if already disconnected
            setTimeout(function() {
              if (e) return done(e);
              done();
            }, 200);
          });
        });

        stopServerDisconnect(true, function(e) {
          if (e) return done(e);
        });
      }
    );
  });

  it('emits reconnected on reconnect', function(done) {
    this.timeout(20000);
    let c = new HappnerClient();
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);

        c.on('reconnected', function() {
          c.disconnect(function(e) {
            setTimeout(function() {
              if (e) return done(e);
              done();
            }, 200);
          });
        });

        stopServer(function(e) {
          if (e) return done(e);
          startServer(function(e) {
            if (e) return done(e);
          });
        });
      }
    );
  });

  it('emits reconnecting on reconnecting', function(done) {
    let c = new HappnerClient();
    c.connect(
      {
        host: 'localhost',
        port: 55000
      },
      {
        protocol: 'https',
        username: '_ADMIN',
        password: 'xxx',
        allowSelfSignedCerts: true
      },
      function(e) {
        if (e) return done(e);

        c.on('reconnecting', function() {
          c.disconnect(function(e) {
            // FAILING: happn-3/issues/13
            // disconnect does not callback if already disconnected
            setTimeout(function() {
              if (e) return done(e);
              done();
            }, 200);
          });
        });

        stopServer(function(e) {
          if (e) return done(e);
        });
      }
    );
  });
});

describe(testHelper.testName(__filename, 4), function() {
  ['insecure', 'secure'].forEach(function(mode) {
    context(mode, function() {
      let server;
      let client;
      let api;

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
              path: component1
            },

            component2: {
              path: component2
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

      before('create client', function(done) {
        this.timeout(10000);
        client = new HappnerClient();

        let model = {
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
        client.connect(null, { username: '_ADMIN', password: 'xxx' }, done);
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
    });
  });
});

describe(testHelper.testName(__filename, 4), function() {
  let server, client, api;
  before('start server', function(done) {
    this.timeout(10000);
    Happner.create({
      util: {
        logLevel: process.env.LOG_LEVEL || 'warn'
      },
      modules: {
        component1: {
          path: component3
        },
        component2: {
          path: component4
        }
      },
      components: {
        component1: {},
        component2: {
          startMethod: 'start',
          stopMethod: 'stop'
        }
      }
    })
      .then(function(_server) {
        server = _server;
        done();
      })
      .catch(done);
  });

  before('start client', function(done) {
    this.timeout(10000);
    let client = new HappnerClient();
    let model = {
      component1: {
        version: '^1.0.0',
        methods: {
          causeEvent: {}
        }
      },
      component2: {
        version: '^1.0.0', // <------------- wrong version
        methods: {
          causeEvent: {}
        }
      }
    };
    api = client.construct(model);
    client
      .connect()
      .then(done)
      .catch(done);
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

  //Leak here
  it('can subscribe to events', function(done) {
    api.event.component1.on(
      'event/one',
      function(data) {
        expect(data).to.eql({ DATA: 1 });
        done();
      },
      function(e) {
        if (e) return done(e);

        api.exchange.component1.causeEvent('event/one', function(e) {
          if (e) return done(e);
        });
      }
    );
  });

  //Leak here
  it('can unsubscribe by eventId', function(done) {
    let eventId;
    let timeout;

    api.event.component1.on(
      'event/two',
      function() {
        clearTimeout(timeout);
        return done(new Error('should be unsubscribed'));
      },
      function(e, _eventId) {
        if (e) return done(e);
        eventId = _eventId;

        api.event.component1.off(eventId, function(e) {
          if (e) return done(e);

          api.exchange.component1.causeEvent('event/two', function(e) {
            if (e) return done(e);
          });

          timeout = setTimeout(function() {
            done();
          }, 200);
        });
      }
    );
  });

  //Leak here
  it('can unsubscribe by path', function(done) {
    let timeout;

    api.event.component1.on(
      'event/three',
      function() {
        clearTimeout(timeout);
        return done(new Error('should be unsubscribed'));
      },
      function(e) {
        if (e) return done(e);

        api.event.component1.on(
          'event/three',
          function() {
            clearTimeout(timeout);
            return done(new Error('should be unsubscribed'));
          },
          function(e) {
            if (e) return done(e);
            api.event.component1.offPath('event/three', function(e) {
              if (e) return done(e);

              api.exchange.component1.causeEvent('event/three', function(e) {
                if (e) return done(e);
              });

              timeout = setTimeout(function() {
                done();
              }, 200);
            });
          }
        );
      }
    );
  });

  //Leak here
  it('does not receive events of wrong version', function(done) {
    let timeout;

    api.event.component2.on(
      'event/one',
      function() {
        clearTimeout(timeout);
        return done(new Error('should not receive - wrong version'));
      },
      function(e) {
        if (e) return done(e);

        timeout = setTimeout(function() {
          done();
        }, 200);
      }
    );
  });
});

describe(testHelper.testName(__filename, 4), function() {
  let server, client, api;

  let startServer1 = function(done) {
    // with component
    Happner.create({
      name: 'MESH_NAME',
      util: {
        logLevel: process.env.LOG_LEVEL || 'warn'
      },
      happn: {
        adminPassword: 'xxx'
      },
      modules: {
        component1: {
          path: component5
        }
      },
      components: {
        component1: {
          startMethod: 'start',
          stopMethod: 'stop'
        }
      }
    })
      .then(function(_server) {
        server = _server;
      })
      .then(done)
      .catch(done);
  };

  let startServer2 = function(done) {
    // without component
    Happner.create({
      name: 'MESH_NAME',
      util: {
        logLevel: process.env.LOG_LEVEL || 'fatal'
      },
      happn: {
        adminPassword: 'xxx'
      }
    })
      .then(function(_server) {
        server = _server;
      })
      .then(done)
      .catch(done);
  };

  let stopServer = function(done) {
    if (!server) return done();
    server.stop(done);
  };

  before('start server', startServer1);

  before('start client', function(done) {
    let _client = new HappnerClient();

    let model = {
      component1: {
        version: '^1.0.0',
        methods: {
          method1: {}
        }
      }
    };

    api = _client.construct(model);
    _client
      .connect({}, { username: '_ADMIN', password: 'xxx' })
      .then(function() {
        client = _client;
      })
      .then(done)
      .catch(done);
  });

  after('stop client', function(done) {
    if (!client) return done();
    client.disconnect(done);
  });

  after('stop server', stopServer);

  context('reconnect to same server with same name', function() {
    it('can still call exchange methods', function(done) {
      api.exchange.component1.method1(function(e) {
        if (e) return done(e);

        stopServer(function(e) {
          if (e) return done(e);

          client.once('reconnected', function() {
            api.exchange.component1.method1(function(e) {
              if (e) return done(e);
              done();
            });
          });

          startServer1(function(e) {
            if (e) return done(e);
          });
        });
      });
    });

    it('resumes events', function(done) {
      let count = 0;
      let counted;

      api.event.component1.on('event/one', function() {
        count++;
      });

      setTimeout(function() {
        stopServer(function(e) {
          if (e) return done(e);

          counted = count;

          client.once('reconnected', function() {
            setTimeout(function() {
              try {
                expect(count > counted).to.be(true);
                done();
              } catch (e) {
                done(e);
              }
            }, 400);
          });

          startServer1(function(e) {
            if (e) return done(e);
          });
        });
      }, 400);
    });
  });

  context('reconnect to different server with same name', function() {
    beforeEach(stopServer);

    beforeEach(startServer1);

    beforeEach(function(done) {
      client.once('reconnected', done);
    });

    it('gets not implemented error on components no longer present', function(done) {
      api.exchange.component1.method1(function(e) {
        if (e) return done(e);

        stopServer(function(e) {
          if (e) return done(e);

          client.once('reconnected', function() {
            api.exchange.component1.method1(function(e) {
              try {
                expect(e.message).to.match(/^Not implemented/);
                done();
              } catch (e) {
                done(e);
              }
            });
          });

          startServer2(function(e) {
            if (e) return done(e);
          });
        });
      });
    });
  });
});

describe(testHelper.testName(__filename, 4), function() {
  let server;
  let adminclient;
  let userclient;

  let addedgroup;
  let addeduser;
  let security;

  before('start a server', function(done) {
    this.timeout(10000);
    Happner.create({
      domain: 'DOMAIN_NAME',
      util: {
        logLevel: process.env.LOG_LEVEL || 'warn'
      },
      happn: {
        secure: true,
        adminPassword: 'xxx'
      },
      modules: {
        component1: {
          path: component1
        },
        component2: {
          path: component2
        }
      },
      components: {
        component1: {},
        component2: {}
      }
    })
      .then(function(_server) {
        server = _server;
        security = server.exchange.security;
        return security.addGroup({
          name: 'group',
          permissions: {
            events: {},
            data: {
              '/allowed/get/*': {
                actions: ['get']
              },
              '/allowed/on/*': {
                actions: ['on', 'set']
              },
              '/allowed/remove/*': {
                actions: ['set', 'remove', 'get']
              },
              '/allowed/all/*': {
                actions: ['*']
              }
            },
            methods: {
              '/DOMAIN_NAME/component1/methodReturningOneArg': {
                authorized: true
              }
            }
          }
        });
      })
      .then(function(group) {
        addedgroup = group;
        return security.addUser({
          username: 'username',
          password: 'password'
        });
      })
      .then(function(user) {
        addeduser = user;
        return security.linkGroup(addedgroup, addeduser);
      })
      .then(function() {
        done();
      })
      .catch(done);
  });

  before('create adminclient', function(done) {
    this.timeout(10000);
    adminclient = new HappnerClient();

    let model = {
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

    adminclient.construct(model);
    adminclient.connect(
      null,
      {
        username: '_ADMIN',
        password: 'xxx'
      },
      done
    );
  });

  before('create userclient', function(done) {
    this.timeout(10000);
    userclient = new HappnerClient();

    let model = {
      component1: {
        version: '^1.0.0',
        methods: {
          methodReturningOneArg: {}
        }
      }
    };

    userclient.construct(model);
    userclient.connect(
      null,
      {
        username: 'username',
        password: 'password'
      },
      done
    );
  });

  after('stop adminclient', function(done) {
    this.timeout(10000);
    if (!adminclient) return done();
    adminclient.disconnect(done);
  });

  after('stop userclient', function(done) {
    this.timeout(10000);
    if (!adminclient) return done();
    userclient.disconnect(done);
  });

  after('stop server', function(done) {
    this.timeout(10000);
    if (!server) return done();
    server.stop(
      {
        reconnect: false
      },
      done
    );
  });

  it('allows access to allowed "on" data points', function(done) {
    let dataClient = userclient.dataClient();

    dataClient.on(
      '/allowed/on/*',
      function(data) {
        expect(data.test).to.be('data');
        done();
      },
      function(e) {
        if (e) return done(e);
        dataClient.set(
          '/allowed/on/1',
          {
            test: 'data'
          },
          function(e) {
            if (e) return done(e);
          }
        );
      }
    );
  });

  it('denies access to denied data points', function(done) {
    let dataClient = userclient.dataClient();

    dataClient.set(
      '/not/allowed/on/1',
      {
        test: 'data'
      },
      function(e) {
        expect(e.toString()).to.be('AccessDenied: unauthorized');
        done();
      }
    );
  });

  it('adds group data permissions, we check we have access to the new path', function(done) {
    let dataClient = userclient.dataClient();

    dataClient.set(
      '/updated/1',
      {
        test: 'data'
      },
      function(e) {
        expect(e.toString()).to.be('AccessDenied: unauthorized');
        let addPermissions = {
          data: {
            '/updated/*': {
              actions: ['on', 'set']
            }
          }
        };

        security
          .addGroupPermissions('group', addPermissions)

          .then(function() {
            dataClient.set(
              '/updated/1',
              {
                test: 'data'
              },
              done
            );
          })
          .catch(done);
      }
    );
  });

  it('removes group data permissions, we check we no longer have access to the new path, but still have access to other paths', function(done) {
    let dataClient = userclient.dataClient();

    dataClient.set(
      '/toremove/1',
      {
        test: 'data'
      },
      function(e) {
        expect(e.toString()).to.be('AccessDenied: unauthorized');
        let addPermissions = {
          data: {
            '/toremove/*': {
              actions: ['on', 'set']
            }
          }
        };

        security
          .addGroupPermissions('group', addPermissions)

          .then(function() {
            return dataClient.set('/toremove/1', {
              test: 'data'
            });
          })
          .then(function() {
            return security.removeGroupPermissions('group', addPermissions);
          })
          .then(function() {
            //ensure we only removed one permission
            return dataClient.get('/allowed/get/*');
          })
          .then(function() {
            dataClient.set(
              '/toremove/1',
              {
                test: 'data'
              },
              function(e) {
                expect(e.toString()).to.be('AccessDenied: unauthorized');
                done();
              }
            );
          })
          .catch(done);
      }
    );
  });

  it('adds group data permissions via a group upsert, we check we have access to the new path and the previous permissions', function(done) {
    let dataClient = userclient.dataClient();

    dataClient.set(
      '/upserted/1',
      {
        test: 'data'
      },
      function(e) {
        expect(e.toString()).to.be('AccessDenied: unauthorized');

        security
          .upsertGroup({
            name: 'group',
            permissions: {
              data: {
                '/upserted/*': {
                  actions: ['get', 'set']
                }
              }
            }
          })
          .then(function() {
            return dataClient.set('/upserted/1', {
              test: 'data'
            });
          })
          .then(function() {
            return dataClient.get('/upserted/1', {
              test: 'data'
            });
          })
          .then(function() {
            return dataClient.get('/allowed/get/*', done);
          })
          .catch(done);
      }
    );
  });
});
