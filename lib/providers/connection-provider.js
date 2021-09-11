(function(isBrowser) {
  var Happn;

  if (isBrowser) {
    Happner.ConnectionProvider = ConnectionProvider;
    Happn = {
      client: HappnClient
    };
  } else {
    module.exports = ConnectionProvider;
    Happn = require('happn-3');
  }

  function ConnectionProvider(happnerClient) {
    this.connected = false;

    var client;
    Object.defineProperty(this, 'client', {
      get: function() {
        return client;
      },
      set: function(_client) {
        client = _client;
      }
    });

    var clients;
    Object.defineProperty(this, 'clients', {
      get: function() {
        return clients;
      },
      set: function(_clients) {
        clients = _clients;
      }
    });

    Object.defineProperty(this, 'happnerClient', { value: happnerClient });
  }

  ConnectionProvider.prototype.connect = function(connections, options, callback) {
    var _this = this;

    if (typeof connections === 'function') {
      callback = connections;
      options = {};
      connections = null;
    }

    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    return Happn.client.create(connections, options, async function(e, client) {
      if (e) {
        return callback(e);
      }

      _this.client = client;

      _this.__onConnectionEnded = _this.client.onEvent('connection-ended', function() {
        _this.connected = false;
        _this.happnerClient.emit('disconnected');
      });

      _this.__onReconnectSuccessful = _this.client.onEvent('reconnect-successful', function() {
        _this.connected = true;
        _this.happnerClient.emit('reconnected');
      });

      _this.__onReconnectScheduled = _this.client.onEvent('reconnect-scheduled', function(opts) {
        if (_this.connected) {
          _this.connected = false;
          _this.happnerClient.emit('disconnected');
        }
        _this.happnerClient.emit('reconnecting', opts);
      });

      _this.happnerClient.emit('connected');
      _this.connected = true;
      _this.bubbleConnectedToClient(callback);
    });
  };
  //ugly - but we dont have access to callbackify, and the browser polyfill looks too complicated for this single instance of necessity
  ConnectionProvider.prototype.bubbleConnectedToClient = async function(callback) {
    try {
      await this.happnerClient.onConnected();
    } catch (e) {
      callback(e);
    }
    callback();
  };

  ConnectionProvider.prototype.getDescription = async function() {
    if (!this.client) {
      throw new Error('getDescription failed: client not ready in connection-provider');
    }
    return await this.client.get('/mesh/schema/description');
  };

  ConnectionProvider.prototype.disconnect = function(callback) {
    var _this = this;
    if (!this.client) return callback();

    if (this.__onConnectionEnded) {
      this.client.offEvent(this.__onConnectionEnded);
    }

    if (this.__onReconnectSuccessful) {
      this.client.offEvent(this.__onReconnectSuccessful);
    }

    if (this.__onReconnectScheduled) {
      this.client.offEvent(this.__onReconnectScheduled);
    }

    this.client.disconnect(function(e) {
      _this.client = undefined;
      callback(e);
    });
  };

  ConnectionProvider.prototype.mount = function(orchestrator) {
    var _this = this;

    this.connected = true;
    this.clients = orchestrator;

    Object.keys(orchestrator.peers).forEach(function(name) {
      var peer = orchestrator.peers[name];
      if (peer.self) {
        _this.client = peer.client;
        // console.log('ID:', name, _this.client.session.id);
      }
    });
  };
})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);
