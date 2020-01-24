const expect = require('expect.js');

const HappnerClient = require('../../..');

const testHelper = require('../../__fixtures/test-helper');

// const why = require('why-is-node-running');

describe(testHelper.testName(__filename, 4), function() {
  // for future use incase of leaks
  // after(function() {
  //   why();
  // });
  let mockOrchestrator;
  let subscriptions;

  beforeEach(function() {
    subscriptions = {};
    mockOrchestrator = {
      peers: {},
      on: function(event) {
        subscriptions[event] = 1;
      },
      off: function(event) {
        subscriptions[event] = 0;
      }
    };
  });

  it('subscribes to peer add and remove', function(done) {
    let c = new HappnerClient();

    // console.log('subscriptions', subscriptions);

    c.mount(mockOrchestrator);
    // console.log('subscriptions after mount', subscriptions);
    expect(subscriptions).to.eql({
      'peer/add': 1,
      'peer/remove': 1
    });

    c.disconnect(done);
  });
});
