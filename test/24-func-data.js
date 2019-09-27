var Happner = require('happner-2');
var HappnerClient = require('..');
var expect = require('expect.js');
var path = require('path');

describe('24 - func - data', function() {
  var server;
  var adminclient;
  var userclient;

  var addedgroup;
  var addeduser;
  var security;

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

    var model = {
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

    var model = {
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
    var dataClient = userclient.dataClient();

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
    var dataClient = userclient.dataClient();

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
    var dataClient = userclient.dataClient();

    dataClient.set(
      '/updated/1',
      {
        test: 'data'
      },
      function(e) {
        expect(e.toString()).to.be('AccessDenied: unauthorized');
        var addPermissions = {
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
    var dataClient = userclient.dataClient();

    dataClient.set(
      '/toremove/1',
      {
        test: 'data'
      },
      function(e) {
        expect(e.toString()).to.be('AccessDenied: unauthorized');
        var addPermissions = {
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
    var dataClient = userclient.dataClient();

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
