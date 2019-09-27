var expect = require('expect.js');

var HappnerClient = require('..');
var OperationsProvider = require('../lib/providers/operations-provider');

describe('03 - unit - construct', function() {
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
      done();
    }
  });

  context('exchange', function() {
    it('builds exchange functions from model', function() {
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
    });

    it('calls operations provider on calls to exchange functions', function(done) {
      OperationsProvider.prototype.request = function(component, version, method) {
        try {
          expect(component).to.be('component1');
          expect(version).to.be('^1.0.0');
          expect(method).to.be('method1');
          done();
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

      api.exchange.component1
        .method1('ARG1')
        .then(function(result) {
          expect(result).to.eql({ RE: 'SULT' });
        })
        .then(done)
        .catch(done);
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
        done();
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
          done();
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
          done();
        });
      });
    });
  });

  context('event', function() {
    it('builds on, off and offPath', function() {
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
        done();
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
        done();
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
        done();
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
        done();
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
      done();
    });
  });

  context('data', function() {
    it('');
  });
});
