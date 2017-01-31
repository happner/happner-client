var expect = require('expect.js');

var ImplementorsProvider = require('../lib/providers/implementors-provider');

describe('05 - unit - implementors provider', function () {

  context('getDescriptions()', function () {

    var mockConnection;

    beforeEach(function () {
      mockConnection = {
        connected: true,
        client: {
          get: function (path, callback) {
            callback(null, {});
          }
        }
      }
    });

    it('gets the description on first call', function (done) {

      mockConnection.client.get = function (path, callback) {
        try {
          expect(path).to.be('/mesh/schema/description');
          done();
        } catch (e) {
          done(e);
        }
      };

      var i = new ImplementorsProvider({}, mockConnection);
      i.getDescriptions();

    });

    it('keeps getting description until description.initializing is false', function (done) {

      this.timeout(3500);

      var count = 0;

      var descriptions = [
        {
          initializing: true
        }, {
          initializing: true
        }, {
          initializing: false
        }, {
          initializing: false
        }
      ];

      mockConnection.client.get = function (path, callback) {
        count++;
        callback(null, descriptions.shift());
      };

      var i = new ImplementorsProvider({}, mockConnection);
      i.getDescriptions();

      setTimeout(function () {
        expect(count).to.be(3);
        done();
      }, 3100);

    });

    it('resolves after description arrives for subsequent calls', function (done) {

      var count = 0;

      mockConnection.client.get = function (path, callback) {
        count++;
        setTimeout(function () {
          callback(null, {
            initializing: false
          });
        }, 100);
      };

      var i = new ImplementorsProvider({}, mockConnection);
      i.getDescriptions();
      i.getDescriptions().then(function () {
        expect(count).to.be(1);
      }).then(done).catch(done);

    });

    it('resolves immediately if got description already', function (done) {

      mockConnection.client.get = function (path, callback) {
        callback(null, {
          initializing: false
        });
      };

      var i = new ImplementorsProvider({}, mockConnection);
      i.getDescriptions()
        .then(function () {
          mockConnection.client.get = function (path, callback) {
            done(new Error('should not get again'));
          };

          return i.getDescriptions()
        })
        .then(function () {
          done();
        });
    });

    it('sets domain', function (done) {

      mockConnection.client.get = function (path, callback) {
        callback(null, {
          initializing: false,
          name: 'DOMAIN_NAME'
        });
      };

      var i = new ImplementorsProvider({}, mockConnection);

      i.getDescriptions()
        .then(function () {
          expect(i.domain).to.be('DOMAIN_NAME');
        })
        .then(done).catch(done);
    });

  });

  context('getNextImplementation()', function () {

    it('reject if no description', function (done) {

      var i = new ImplementorsProvider({}, {});

      i.getNextImplementation('component', 'version', 'method')
        .catch(function (e) {
          expect(e.message).to.be('Missing description');
          done();
        })
        .catch(done);

    });

    it('resolves if already mapped', function (done) {

      var i = new ImplementorsProvider({}, {});

      i.descriptions = [{}];
      i.maps['component/version/method'] = [{local: true}];

      i.getNextImplementation('component', 'version', 'method')
        .then(function (result) {
          expect(result).to.eql({local: true});
        })
        .then(done).catch(done);

    });

    it('resolves in round robin', function (done) {

      var i = new ImplementorsProvider({}, {});

      i.descriptions = [{}];
      i.maps['component/version/method'] = [
        {local: true},
        {local: false, name: 'peer1'},
        {local: false, name: 'peer2'}
      ];

      i.getNextImplementation('component', 'version', 'method')
        .then(function (result) {
          expect(result).to.eql({local: true});
          return i.getNextImplementation('component', 'version', 'method');
        })
        .then(function (result) {
          expect(result).to.eql({local: false, name: 'peer1'});
          return i.getNextImplementation('component', 'version', 'method');
        })
        .then(function (result) {
          expect(result).to.eql({local: false, name: 'peer2'});
          return i.getNextImplementation('component', 'version', 'method');
        })
        .then(function (result) {
          expect(result).to.eql({local: true});
        })
        .then(done).catch(done);

    });

    it('creates the implementation map just-in-time', function (done) {

      var i = new ImplementorsProvider({}, {});

      i.descriptions = [{
        components: {
          component1: {
            name: 'component1',
            version: '1.2.4',
            methods: {
              'method1': {}
            }
          }
        }
      }];

      i.getNextImplementation('component1', '^1.0.0', 'method1')
        .then(function (result) {
          expect(result).to.eql({local: true});
          done();
        })
        .catch(done);

    });

    it('remembers when method not implemented (empty array)', function (done) {

      var i = new ImplementorsProvider({}, {});

      i.descriptions = [{}];
      i.maps['component/version/method'] = [];

      i.getNextImplementation('component', 'version', 'method')
        .catch(function (e) {
          expect(e.message).to.eql('Not implemented');
          done();
        })
        .catch(done);

    });

    it('rejects if not implemented component', function (done) {

      var i = new ImplementorsProvider({}, {});

      i.descriptions = [{
        components: {}
      }];

      i.getNextImplementation('component', 'version', 'method')
        .catch(function (e) {
          expect(e.message).to.eql('Not implemented');
          done();
        })
        .catch(done);

    });

    it('rejects if not implemented version', function (done) {

      var i = new ImplementorsProvider({}, {});

      i.descriptions = [{
        components: {
          component1: {
            name: 'component1',
            version: '2.1.4',
            methods: {
              'method1': {}
            }
          }
        }
      }];

      i.getNextImplementation('component1', '^1.0.0', 'method1')
        .catch(function (e) {
          expect(e.message).to.equal('Not implemented');
          done();
        })
        .catch(done);

    });

    it('rejects if not implemented method', function (done) {

      var i = new ImplementorsProvider({}, {});

      i.descriptions = [{
        components: {
          component1: {
            name: 'component1',
            version: '1.1.4',
            methods: {
              'method1': {}
            }
          }
        }
      }];

      i.getNextImplementation('component1', '^1.0.0', 'method2')
        .catch(function (e) {
          expect(e.message).to.equal('Not implemented');
          done();
        })
        .catch(done);

    });

    xit('destroys all maps on new description');

  });

});
