var expect = require('expect.js');

var HappnerClient = require('..');
var ConnectionProvider = require('../lib/providers/connection-provider');
var OperationsProvider = require('../lib/providers/operations-provider');


describe('01 - unit - initialization', function () {

  context('connection provider', function () {

    it('is initialized in client', function () {
      var c = new HappnerClient();
      expect(c.__connection).to.be.an(ConnectionProvider);
    });

    it('throws on attempt to use un-connected connection', function () {
      var c = new HappnerClient();
      try {
        c.__connection.client;
      } catch (e) {
        expect(e.message).to.be('Not connected');
      }
    });

    it('initializes happn client using connect()');

  });

  context('operations provider', function () {

    it('is initialized in client', function () {
      var c = new HappnerClient();
      expect(c.__operations).to.be.an(OperationsProvider);
    });

    it('has access to connection', function () {
      var c = new HappnerClient();
      expect(c.__operations.connection).to.be.an(ConnectionProvider);
    });

  });

});
