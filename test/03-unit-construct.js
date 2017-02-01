var expect = require('expect.js');

var HappnerClient = require('..');
var OperationsProvider = require('../lib/providers/operations-provider');
var ConnectionProvider = require('../lib/providers/connection-provider');

describe('03 - unit - construct', function () {

  beforeEach(function () {
    this.originalRun = OperationsProvider.prototype.request;
  });

  afterEach(function () {
    OperationsProvider.prototype.request = this.originalRun;
  });

  context('exchange', function () {

    it('errors on model without version declared', function (done) {
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
        var api = c.construct(model);
      } catch (e) {
        expect(e.message).to.be('Missing version');
        done();
      }
    });

    it('errors on model without methods declared', function (done) {
      var model = {
        component1: {
          version: '^1.0.0',
          // methods: {
          //   method1: {},
          //   method2: {}
          // }
        }
      };

      var c = new HappnerClient();

      try {
        var api = c.construct(model);
      } catch (e) {
        expect(e.message).to.be('Missing methods');
        done();
      }
    });

    it('builds exchange functions from model', function () {
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

    it('calls operations provider on calls to exchange functions', function (done) {
      OperationsProvider.prototype.request = function (component, version, method) {
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

    it('supports promises on exchange calls', function (done) {
      OperationsProvider.prototype.request = function (component, version, method, args, callback) {
        callback(null, {RE:'SULT'})
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

      api.exchange.component1.method1('ARG1')
        .then(function (result) {
          expect(result).to.eql({RE:'SULT'});
        })
        .then(done).catch(done);
    });

    it('supports callbacks on exchange calls', function (done) {
      OperationsProvider.prototype.request = function (component, version, method, args, callback) {
        callback(null, {RE:'SULT'});
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
        expect(result).to.eql({RE:'SULT'});
        done();
      });
    });

  });

  context('event', function () {

    it('');

  });

  context('data', function () {

    it('');

  });

})
;
