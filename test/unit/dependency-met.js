const test = require('../__fixtures/test-helper').create();
var EventEmitter = require('events').EventEmitter;
var ImplementorsProvider = require('../../lib/providers/implementors-provider');

describe(test.name(__filename, 2), function() {
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

  it('emits the peer/arrived/description event', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {},
      warn: function() {}
    };

    var testDescriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];

    i.descriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];

    i.gotDescriptions = true;

    i.happnerClient.on('peer/arrived/description', function(whatChanged) {
      test.expect(whatChanged).to.eql({
        dependorName: 'test1',
        countMatches: 1,
        componentName: 'component1',
        version: '^1.0.0',
        description: {
          version: '1.1.0'
        },
        url: undefined,
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

  it('tests the logdependencies met function, dependencies not met', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {},
      warn: function() {}
    };

    i.descriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];

    i.gotDescriptions = true;

    i.dependencies = {
      test1: {
        component1: '^1.0.0',
        component2: '1.0.0'
      }
    };
    test.expect(i.logDependenciesMet(i.descriptions)).to.be(false);
    done();
  });

  it('tests the logdependencies met function, dependencies are met', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {},
      warn: function() {}
    };

    i.descriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];

    i.gotDescriptions = true;

    i.dependencies = {
      test1: {
        component1: '^1.0.0'
      }
    };
    test.expect(i.logDependenciesMet(i.descriptions)).to.be(true);
    done();
  });

  it('tests the logdependencies met function fires Event when dependencies are met', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {},
      warn: function() {}
    };

    i.descriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];

    i.gotDescriptions = true;

    i.dependencies = {
      test1: {
        component1: '^1.0.0'
      }
    };
    i.happnerClient.on('test1/startup/dependencies/satisfied', () => {
      test.expect(i.events.once['test1/startup/dependencies/satisfied']).to.be(true);
      done();
    });
    test.expect(i.logDependenciesMet(i.descriptions)).to.be(true);
  });

  it('tests the logdependencies met function when dependencies are undefined', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {},
      warn: function() {}
    };

    i.descriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];

    i.gotDescriptions = true;

    test.expect(i.logDependenciesMet(i.descriptions)).to.be(true);
    done();
  });

  it('tests the logdependencies met function when dependencies are empty object', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {},
      warn: function() {}
    };

    i.descriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];
    i.dependencies = {};
    i.gotDescriptions = true;

    test.expect(i.logDependenciesMet(i.descriptions)).to.be(true);
    done();
  });

  it('tests the logdependencies met function when inner/component dependencies are empty object', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {},
      warn: function() {}
    };

    i.descriptions = [
      {
        components: {
          component1: {
            version: '1.1.0'
          }
        }
      }
    ];
    i.dependencies = {
      test1: {}
    };
    i.gotDescriptions = true;
    test.expect(i.logDependenciesMet(i.descriptions)).to.be(true);
    done();
  });

  it('tests the registerAndCheck function registers dependencies and calls logDependenciesMet', function(done) {
    var i = new ImplementorsProvider(mockClient, mockConnection);
    i.log = {
      info: function() {},
      error: function() {},
      warn: function() {}
    };
    i.descriptions = { TEST: 'DESCRIPTIONS' };
    let testDependencies = {
      component1: {
        version: '3.1.1'
      },
      component2: {
        version: '*'
      }
    };
    i.logDependenciesMet = descriptions => {
      test.expect(descriptions).to.be(i.descriptions);
      test
        .expect(i.dependencies)
        .to.eql({ newComponent: { component1: '3.1.1', component2: '*' } });
      return true;
    };
    test.expect(i.addAndCheckDependencies('newComponent', testDependencies)).to.be(true);
    done();
  });
});
