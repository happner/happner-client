const test = require('../__fixtures/test-helper').create();
var HappnerClient = require('../..');

describe(test.name(__filename, 3), function() {
  this.timeout(10000);

  //   after('checks open handles', async () => {
  //     await test.delay(5000);
  //     test.why();
  //   });

  it('subscribes to peer add and remove', async () => {
    const client = new HappnerClient();
    const handler = () => {};
    const callback = () => {};
    client.__operations.subscribe = test.sinon.stub();
    client.__operations.unsubscribePath = test.sinon.stub();
    const mockEventApi = {
      event: {
        testComponent: {}
      }
    };
    client.__mountEvent(mockEventApi, 'testComponent', '*');
    mockEventApi.event.testComponent.on('test/path', { test: 'options' }, handler, callback);
    test
      .expect(client.__operations.subscribe.lastCall.args)
      .to.eql(['testComponent', '*', 'test/path', handler, callback, { test: 'options' }]);

    mockEventApi.event.testComponent.on('test/path', handler, callback);
    test
      .expect(client.__operations.subscribe.lastCall.args)
      .to.eql(['testComponent', '*', 'test/path', handler, callback, {}]);

    client.__operations.stop();
  });
});
