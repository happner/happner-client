const expect = require('expect.js');

const HappnerClient = require('../../..');

const testHelper = require('../../__fixtures/test-helper');
const OperationsProvider = require('../../../lib/providers/operations-provider');
const ImplementorsProvider = require('../../../lib/providers/implementors-provider');
const EventEmitter = require('events').EventEmitter;

const why = require('why-is-node-running');

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
      }
    };
  });

  it('subscribes to peer add and remove', function(done) {
    let c = new HappnerClient();

    c.mount(mockOrchestrator);
    expect(subscriptions).to.eql({
      'peer/add': 1,
      'peer/remove': 1
    });

    c.disconnect(done);
  });
});
