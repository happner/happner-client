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

  it('tests the __getUpdatedDependencyDescription method', function() {
    var i = new ImplementorsProvider(mockClient, mockConnection);

    let descriptions1 = [{
      components: {
        component1: {
          version: '1.1.0'
        }
      }
    }];

    expect(i.__getUpdatedDependencyDescription(descriptions1, 'component1', '^1.1.0'))
      .to.eql(descriptions1[0]);

    let descriptions2 = [{
      components: {
        component2: {
          version: '1.1.0'
        }
      }
    }];

    expect(i.__getUpdatedDependencyDescription(descriptions2, 'component1', '^1.1.0'))
      .to.eql(undefined);

    let descriptions3 = {
      components: {
        component2: {
          version: '1.1.0'
        }
      }
    };

    expect(i.__getUpdatedDependencyDescription(descriptions3, 'component2', '^1.1.0'))
      .to.eql(descriptions3);

    let descriptions4 = {
      components: {
        component5: {
          version: '1.1.0'
        }
      }
    };

    expect(i.__getUpdatedDependencyDescription(descriptions4, 'component1', '^1.1.0'))
      .to.eql(undefined);

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
        },
        url:undefined,
        meshName: undefined
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
