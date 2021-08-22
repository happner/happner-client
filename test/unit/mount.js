const test = require('../__fixtures/test-helper').create();
var HappnerClient = require('../..');

describe(test.name(__filename, 3), function() {
  var mockOrchestrator;
  var subscriptions;

  beforeEach(function() {
    subscriptions = {};
    mockOrchestrator = {
      peers: {},
      on: function(event) {
        subscriptions[event] = 1;
      }
    };
  });

  it('subscribes to peer add and remove', function(done) {
    var c = new HappnerClient();

    c.mount(mockOrchestrator);
    test.expect(subscriptions).to.eql({
      'peer/add': 1,
      'peer/remove': 1
    });
    c.__operations.stop();
    c.__implementors.stop();
    done();
  });
});
