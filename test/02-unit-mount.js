var expect = require('expect.js');

var HappnerClient = require('..');

describe('02 - unit - mount', function() {
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
    expect(subscriptions).to.eql({
      'peer/add': 1,
      'peer/remove': 1
    });

    done();
  });

  xit('unsubscribes from peer add and remove');
});
