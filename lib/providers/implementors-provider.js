(function(isBrowser) {
  var semver;

  if (isBrowser) {
    Happner.ImplementorsProvider = ImplementorsProvider;
    semver = Happner.semver;
  } else {
    module.exports = ImplementorsProvider;
    semver = require('../semver');
  }

  function ImplementorsProvider(happnerClient, connection) {
    Object.defineProperty(this, 'happnerClient', {
      value: happnerClient
    });
    this.log = happnerClient.log;
    this.connection = connection;
    this.dependencies = {};
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

    // got all "starting" descriptions from peers already present at join time
    this.gotDescriptions = false;

    // pending list of descriptions we're waiting for
    this.awaitingDescriptions = {};

    happnerClient.on('reconnected', (this.reconnectedHandler = this.clear.bind(this)));
  }

  ImplementorsProvider.prototype.clear = function() {
    this.maps = {};
    this.descriptions = [];
    this.callersAwaitingDescriptions = [];
  };

  ImplementorsProvider.prototype.getSingleDescription = function(
    client,
    self,
    cluster,
    onSuccess,
    onFailure,
    onIgnore
  ) {
    var _this = this;

    client.get('/mesh/schema/description', function(e, description) {
      if (e) return onFailure(e);

      if (!description || description.initializing) {
        setTimeout(function() {
          _this.getSingleDescription(client, self, cluster, onSuccess, onFailure, onIgnore);
        }, 1000);
        return;
      }

      if (!client.session) return onFailure(new Error('client session not set, no longer active'));

      description.meshName = client.session.happn.name;
      description.self = self;
      description.url = client.options && client.options.url ? client.options.url : null;

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
        if (cluster && description.brokered) {
          if (!client.session.info) client.session.info = {};
          client.session.info.clusterName = description.meshName;
          return onIgnore(`ignoring brokered description for peer: ${client.session.happn.name}`);
        }
        _this.addDescription(description);
      }
      onSuccess(description);
    });
  };

  ImplementorsProvider.prototype.subscribeToPeerEvents = function() {
    this.connection.clients.on('peer/add', (this.addPeerHandler = this.addPeer.bind(this)));
    this.connection.clients.on(
      'peer/remove',
      (this.removePeerHandler = this.removePeer.bind(this))
    );
  };

  ImplementorsProvider.prototype.unsubscribeFromPeerEvents = function() {
    this.connection.clients.removeListener('peer/add', this.addPeerHandler);
    this.connection.clients.removeListener('peer/remove', this.removePeerHandler);
  };

  ImplementorsProvider.prototype.stop = function() {
    this.happnerClient.removeListener('reconnected', this.reconnectedHandler);
    this.clear();
  };

  ImplementorsProvider.prototype.addPeer = function(name) {
    var _this = this;
    var peer = this.connection.clients.peers[name];
    var onSuccess = function(description) {
      var clonedDescription = Object.assign({}, description);
      _this.logDependenciesMet(clonedDescription);
    };
    var onFailure = function(e) {
      _this.happnerClient.log.error('failed to get description for %s', name, e);
    };
    var onIgnore = function(reason) {
      _this.happnerClient.log.info(reason);
    };

    this.getSingleDescription(peer.client, peer.self, true, onSuccess, onFailure, onIgnore);
  };

  ImplementorsProvider.prototype.removePeer = function(name) {
    var removedPeerDescription = this.removeDescription(name);
    if (removedPeerDescription)
      this.happnerClient.emit('peer/departed/description', removedPeerDescription);
  };

  ImplementorsProvider.prototype.getDescriptions = function() {
    var _this = this;
    return new Promise(function(resolve, reject) {
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

      var success = function(description) {
        var reply;
        while ((reply = _this.callersAwaitingDescriptions.shift())) {
          reply.resolve();
        }
        _this.gotDescriptions = true;
        _this.callersAwaitingDescriptions = false;
        _this.logDependenciesMet(description);
      };

      var failure = function(e) {
        var reply;
        while ((reply = _this.callersAwaitingDescriptions.shift())) {
          reply.reject(e);
        }
      };

      var ignore = function(reason) {
        _this.log.info(reason);
        var reply;
        while ((reply = _this.callersAwaitingDescriptions.shift())) {
          reply.resolve();
        }
        _this.gotDescriptions = true;
        _this.callersAwaitingDescriptions = false;
      };

      var fetchMultiple = function(clients) {
        return Promise.all(
          Object.keys(clients).map(function(name) {
            return new Promise(function(resolve) {
              var client = clients[name].client;
              var self = clients[name].self;
              _this.getSingleDescription(client, self, true, resolve, resolve, reason => {
                _this.log.info(reason);
                resolve();
              });
            });
          })
        );
      };

      if (_this.connection.clients) {
        return fetchMultiple(_this.connection.clients.peers).then(success);
      }

      if (_this.connection.client) {
        return _this.getSingleDescription(
          _this.connection.client,
          true,
          false,
          success,
          failure,
          ignore
        );
      }
    });
  };

  ImplementorsProvider.prototype.addDescription = function(description) {
    var _this = this;
    this.descriptions.push(description);
    Object.keys(this.maps).forEach(function(mapPath) {
      var parts = mapPath.split('/');
      var componentName = parts[0];
      var version = parts[1];
      var methodName = parts[2];
      var component = description.components[componentName];

      if (!component) return;
      if (!semver.coercedSatisfies(component.version, version)) return;
      if (!component.methods) return;
      if (!component.methods[methodName]) return;

      var mapData = _this.maps[mapPath];
      mapData.push({
        local: description.self,
        name: description.meshName
      });
    });
  };

  ImplementorsProvider.prototype.removeDescription = function(name) {
    var _this = this,
      removed;

    this.descriptions = this.descriptions.filter(function(el) {
      if (el.meshName !== name) return true;
      removed = el;
      return false;
    });

    Object.keys(this.maps).forEach(function(mapPath) {
      _this.maps[mapPath] = _this.maps[mapPath].filter(function(el) {
        return el.name !== name;
      });
    });
    return removed;
  };

  ImplementorsProvider.prototype.notImplementedError = function(
    componentName,
    version,
    methodName
  ) {
    return new Error('Not implemented ' + componentName + ':' + version + ':' + methodName);
  };

  ImplementorsProvider.prototype.getNextImplementation = function(
    componentName,
    version,
    methodName
  ) {
    var mapKey, mapData;

    mapKey = componentName + '/' + version + '/' + methodName;
    mapData = this.maps[mapKey];

    if (mapData != null) {
      if (mapData.length === 0) {
        return Promise.reject(this.notImplementedError(componentName, version, methodName));
      }
      return Promise.resolve(this.getNext(mapData));
    }

    mapData = [];

    this.descriptions.forEach(function(description) {
      var components = description.components;
      Object.keys(components).forEach(function(compName) {
        if (compName !== componentName) return;
        var component = components[compName];
        if (!semver.coercedSatisfies(component.version, version)) return;
        Object.keys(component.methods).forEach(function(methName) {
          if (methName !== methodName) return;
          mapData.push({
            local: description.self,
            name: description.meshName
          });
        });
      });
    });

    this.maps[mapKey] = mapData;

    if (mapData.length === 0) {
      return Promise.reject(this.notImplementedError(componentName, version, methodName));
    }
    return Promise.resolve(this.getNext(mapData));
  };

  ImplementorsProvider.prototype.getNext = function(array) {
    if (typeof array.__lastSequence === 'undefined') {
      array.__lastSequence = 0;
      return array[array.__lastSequence];
    }

    array.__lastSequence++;
    if (array.__lastSequence >= array.length) {
      array.__lastSequence = 0;
    }
    return array[array.__lastSequence];
  };

  ImplementorsProvider.prototype.registerDependency = function(
    dependorName,
    componentName,
    version
  ) {
    if (!dependorName) return; // no $happn.name, not in cluster
    this.dependencies[dependorName] = this.dependencies[dependorName] || {};
    this.dependencies[dependorName][componentName] = version;
  };

  ImplementorsProvider.prototype.logDependenciesMet = function(descriptions) {
    if (!this.gotDescriptions) return;
    Object.keys(this.dependencies).forEach(dependorName => {
      let satisfied = true;
      let dependencies = {
        tree: this.dependencies[dependorName],
        keys: Object.keys(this.dependencies[dependorName])
      };
      dependencies.keys.forEach(componentName => {
        let version = dependencies.tree[componentName];
        let countMatches = this.countDependencyMatches(componentName, version);
        let log = this.log.info;
        if (countMatches === 0) {
          satisfied = false;
          log = this.log.warn;
        }
        log('dependent %s has %d of %s %s', dependorName, countMatches, componentName, version);
        this.__getUpdatedDependencyDescriptions(descriptions, componentName, version).forEach(
          foundComponentDescription => {
            this.happnerClient.emit('peer/arrived/description', {
              dependorName: dependorName,
              countMatches: countMatches,
              componentName: componentName,
              version: version,
              description: foundComponentDescription.components[componentName],
              url: foundComponentDescription.url,
              meshName: foundComponentDescription.meshName
            });
          }
        );
      });

      if (satisfied && !this.events.once[`${dependorName}/startup/dependencies/satisfied`]) {
        this.events.once[`${dependorName}/startup/dependencies/satisfied`] = true;
        this.happnerClient.emit(
          `${dependorName}/startup/dependencies/satisfied`,
          dependencies.keys
        );
      }
    });
  };

  ImplementorsProvider.prototype.__getUpdatedDependencyDescriptions = function(
    descriptions,
    componentName,
    version
  ) {
    if (!Array.isArray(descriptions)) descriptions = [descriptions];

    return descriptions.filter(function(description) {
      if (!description || !description.components || !description.components[componentName])
        return false;
      if (semver.coercedSatisfies(description.components[componentName].version, version))
        return true;
    });
  };

  ImplementorsProvider.prototype.countDependencyMatches = function(componentName, version) {
    var count = 0;
    this.descriptions.forEach(function(description) {
      if (!description.components[componentName]) return;
      var gotVersion = description.components[componentName].version;
      if (!semver.coercedSatisfies(gotVersion, version)) return;
      count++;
    });
    return count;
  };
})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);
