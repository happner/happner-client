var expect = require('expect.js');
var EventEmitter = require('events').EventEmitter;
var ImplementorsProvider = require('../lib/providers/implementors-provider');

describe('08 - unit - dependency met event', function() {

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

  it('emits the dependency met event', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {}
    }

    var testDescriptions = [{
      components: {
        component1: {
          version: '1.1.0'
        }
      }
    }];

    i.descriptions = [{
      components: {
        component1: {
          version: '1.1.0'
        }
      }
    }];

    i.gotDescriptions = true;

    i.happnerClient.on('dependency-met', function(whatChanged) {
      expect(whatChanged).to.eql({
        dependorName: 'test1',
        countMatches: 1,
        componentName: 'component1',
        version: '^1.0.0',
        description: {
          version: '1.1.0'
        }
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
