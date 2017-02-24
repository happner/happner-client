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

  this.reconnectedHandler = undefined;
  this.addPeerHandler = undefined;
  this.removePeerHandler = undefined;

  // queued promise callbacks for callers to getDescriptions()
  // fist caller performs the fetching, subsequent callers wait
  // for first caller to complete then all resolve.
  this.callersAwaitingDescriptions = [];

  // pending list of descriptions we're waiting for
  this.awaitingDescriptions = {};


  happnerClient.on('reconnected', this.reconnectedHandler = this.clear.bind(this));
}

ImplementorsProvider.prototype.clear = function () {
  this.maps = {};
  this.descriptions = [];
  this.callersAwaitingDescriptions = [];
};

ImplementorsProvider.prototype.getSingleDescription = function(client, self, cluster, onSuccess, onFailure) {
  var _this = this;

  client.get('/mesh/schema/description', function (e, description) {
    var reply;

    if (e) {
      return onFailure(e);
    }

    if (!description || description.initializing) {
      setTimeout(function () {
        _this.getSingleDescription(client, self, cluster, onSuccess, onFailure);
      }, 1000);
      return;
    }

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

ImplementorsProvider.prototype.subscribeToPeerEvents = function () {
  this.connection.clients.on('peer/add', this.addPeerHandler = this.addPeer.bind(this));
  this.connection.clients.on('peer/remove', this.removePeerHandler = this.removePeer.bind(this));
};

ImplementorsProvider.prototype.unsubscribeFromPeerEvents = function () {
  this.connection.clients.removeListener('peer/add', this.addPeerHandler);
  this.connection.clients.removeListener('peer/remove', this.removePeerHandler);
};

ImplementorsProvider.prototype.stop = function () {
  this.happnerClient.removeListener('reconnected', this.reconnectedHandler);
  this.clear();
};

ImplementorsProvider.prototype.addPeer = function (name) {
  var _this = this;
  var peer = this.connection.clients.peers[name];
  var onSuccess = function () {};
  var onFailure = function (e) {
    _this.happnerClient.log.error('failed to get description for %s', name, e);
  };

  this.getSingleDescription(peer.client, peer.self, true, onSuccess, onFailure);

};

ImplementorsProvider.prototype.removePeer = function (name) {
  this.removeDescription(name);
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

    var fetchMultiple = function (clients) {
      return Promise.resolve(Object.keys(clients)).map(function (name) {
        return new Promise(function (resolve) {
          var client = clients[name].client;
          var self = clients[name].self;
          _this.getSingleDescription(client, self, true, resolve, resolve);
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
      return _this.getSingleDescription(_this.connection.client, true, false, success, failure);
    }

  });
};

ImplementorsProvider.prototype.addDescription = function (description) {
  var _this = this;
  this.descriptions.push(description);
  Object.keys(this.maps).forEach(function (mapPath) {
    var parts = mapPath.split('/');
    var componentName = parts[0];
    var version = parts[1];
    var methodName = parts[2];
    var component = description.components[componentName];

    if (!component) return;
    if (!semver.satisfies(component.version, version)) return;
    if (!component.methods) return;
    if (!component.methods[methodName]) return;

    var mapData = _this.maps[mapPath];
    mapData.push({local: description.self, name: description.meshName});

  });
};

ImplementorsProvider.prototype.removeDescription = function (name) {
  var _this = this;

  this.descriptions = this.descriptions.filter(function (el) {
    return el.meshName != name;
  });

  Object.keys(this.maps).forEach(function (mapPath) {
    _this.maps[mapPath] = _this.maps[mapPath].filter(function (el) {
      return el.name != name;
    });
  });
  // TODO: remove subscriptions (response paths)
};

ImplementorsProvider.prototype.notImplementedError = function (componentName, version, methodName) {
  return new Error('Not implemented ' + componentName + ':' + version + ':' + methodName);
};

ImplementorsProvider.prototype.getNextImplementation = function (componentName, version, methodName) {
  var _this = this, mapKey, mapData;

  // if (this.descriptions.length == 0) return Promise.reject(new Error('Missing description'));

  mapKey = componentName + '/' + version + '/' + methodName;
  if (mapData = this.maps[mapKey]) {
    if (mapData.length == 0) {
      return Promise.reject(this.notImplementedError(componentName, version, methodName));
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

  if (mapData.length == 0) {
    return Promise.reject(this.notImplementedError(componentName, version, methodName));
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
