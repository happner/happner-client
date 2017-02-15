module.exports = ImplementorsProvider;

// TODO: peer departs: remove description and toss all maps to allow just-in-time rebuild

var Promise = require('bluebird');
var semver = require('semver');

function ImplementorsProvider(happnerClient, connection) {
  Object.defineProperty(this, 'happnerClient', {value: happnerClient});
  this.connection = connection;
  this.descriptions = [];
  this.maps = {};

  this.name = undefined;
  this.domain = undefined;
  this.sessionId = undefined;
  this.secure = undefined;

  // queued promise callbacks for callers to getDescriptions()
  // fist caller performs the fetching, subsequent callers wait
  // for first caller to complete then all resolve.
  this.callersAwaitingDescriptions = [];

  // pending list of descriptions we're waiting for
  this.awaitingDescriptions = {};

  happnerClient.on('reconnected', this.clear.bind(this));
}

ImplementorsProvider.prototype.clear = function () {
  // TODO: only clear the specifically gone description and map entries
  this.maps = {};
  this.descriptions = [];
  this.callersAwaitingDescriptions = [];
};

ImplementorsProvider.prototype.getDescriptions = function () {
  var _this = this;
  return new Promise(function (resolve, reject) {

    if (!_this.connection.connected) {
      return reject(new Error('Not connected'));
    }

    if (_this.callersAwaitingDescriptions === false) return resolve();

    _this.callersAwaitingDescriptions = _this.callersAwaitingDescriptions || [];

    _this.callersAwaitingDescriptions.push({
      resolve: resolve,
      reject: reject
    });

    if (_this.callersAwaitingDescriptions.length > 1) return;

    var success = function () {
      var reply;
      while (reply = _this.callersAwaitingDescriptions.shift()) {
        reply.resolve();
      }
      _this.callersAwaitingDescriptions = false;
    };

    var failure = function (e) {
      var reply;
      while (reply = _this.callersAwaitingDescriptions.shift()) {
        reply.reject(e);
      }
    };

    var fetchSingle = function (client, self, cluster, onSuccess, onFailure) {
      client.get('/mesh/schema/description', function (e, description) {
        var reply;

        if (e) {
          return onFailure(e);
        }

        if (description.initializing) {
          setTimeout(function() {
            fetchSingle(client, self, cluster, onSuccess, onFailure);
          }, 1000);
          return;
        }

        // TODO: dont flush maps
        _this.maps = {};
        // TODO: properly add and remove descriptions, including ignoring self
        //       ie. amend maps accordingly, remove response subscriptions

        description.meshName = client.session.happn.name;
        description.self = self;

        if (self) {
          // future: clusters with multiple domains do magic here somehow...
          _this.domain = description.name;
          _this.sessionId = client.session.id;
          _this.secure = client.session.happn.secure;

          if (cluster) {
            _this.name = client.session.happn.name;
          } else {
            _this.addDescription(description);
          }

        } else {
          _this.addDescription(description);
        }

        onSuccess();
      });
    };

    var fetchMultiple = function (clients) {
      return Promise.resolve(Object.keys(clients)).map(function (name) {
        return new Promise(function (resolve) {
          var client = clients[name].client;
          var self = clients[name].self;
          fetchSingle(client, self, true, resolve, resolve);
        });
      });
    };

    if (_this.connection.clients) {
      return fetchMultiple(_this.connection.clients.peers)
        .then(success);
      // .catch(function (e) {
      //   _this.happnerClient.log.error(e);
      //   // still succeeds because only error is timeout on getting
      //   // description per departed peer and can therefore be
      //   // ignored since it's departed...
      //   success();
      // })
    }

    if (_this.connection.client) {
      return fetchSingle(_this.connection.client, true, false, success, failure);
    }

  });
};

ImplementorsProvider.prototype.addDescription = function (description) {
  this.descriptions.push(description);
  // TODO: append into maps
};

ImplementorsProvider.prototype.removeDescription = function (description) {
  // TODO: remove from maps
  // TODO: remove subscriptions (response paths)
};

ImplementorsProvider.prototype.getNextImplementation = function (componentName, version, methodName) {
  var _this = this, mapKey, mapData;

  // if (this.descriptions.length == 0) return Promise.reject(new Error('Missing description'));

  mapKey = componentName + '/' + version + '/' + methodName;
  if (mapData = this.maps[mapKey]) {
    if (mapData.length == 0) {
      return Promise.reject(new Error('Not implemented'));
    }
    return Promise.resolve(this.getNext(mapData));
  }

  mapData = [];

  this.descriptions.forEach(function (description) {
    var components = description.components;
    Object.keys(components).forEach(function (compName) {
      if (compName != componentName) return;

      var component = components[compName];

      if (!semver.satisfies(component.version, version)) return;

      Object.keys(component.methods).forEach(function (methName) {
        if (methName != methodName) return;
        mapData.push({local: description.self, name: description.meshName});
      });
    });
  });

  this.maps[mapKey] = mapData;

  console.log('DESCRIPTIONS:', this.descriptions);

  if (mapData.length == 0) {
    return Promise.reject(new Error('Not implemented'));
  }

  return Promise.resolve(this.getNext(mapData));
};





ImplementorsProvider.prototype.getNext = function (array) {
  if (typeof array.__lastSequence == 'undefined') {
    array.__lastSequence = 0;
    return array[array.__lastSequence];
  }

  array.__lastSequence++;
  if (array.__lastSequence >= array.length) {
    array.__lastSequence = 0;
  }
  return array[array.__lastSequence];
};
