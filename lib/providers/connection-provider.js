// Provides either
// 1. happn client (standalone client)
// 2. orchestrator peers (in cluster)

module.exports = ConnectionProvider;

var Happn = require('happn-3');

function ConnectionProvider(happnerClient) {
  this.connected = false;

  Object.defineProperty(this, 'client', {
    get: function () {
      if (!this.connected) {
        throw new Error('Not connected');
      }
      return this.__client;
    },
    enumerable: true
  });

  var client;
  Object.defineProperty(this, '__client', {
    get: function () {
      return client;
    },
    set: function (_client) {
      client = _client;
    }
  });

  Object.defineProperty(this, 'happnerClient', {value: happnerClient});
}

ConnectionProvider.prototype.connect = function (connections, info, callback) {
  var _this = this;
  if (!connections) connections = [{}];
  if (typeof info == 'function') {
    callback = info;
    info = {};
  }
  if (typeof connections == 'function') {
    callback = connections;
    connections = [{}];
    info = {};
  }

  connections.forEach(function (connection) {
    connection.info = info;
  });

  // TODO: support for multiple connections[]
  var client = new Happn.client();
  client.client(connections[0]);

  return client.initialize(function (e) {
    if (e) {
      _this.happnerClient.emit('error', e);
      return callback(e);
    }

    _this.__client = client;

    _this.__onConnectionEnded = _this.__client.onEvent('connection-ended', function () {
      _this.connected = false;
      _this.happnerClient.emit('disconnected');
    });

    _this.__onReconnectSuccessful = _this.__client.onEvent('reconnect-successful', function () {
      _this.connected = true;
      _this.happnerClient.emit('reconnected');
    });

    _this.__onReconnectScheduled = _this.__client.onEvent('reconnect-scheduled', function (opts) {
      if (_this.connected) {
        _this.connected = false;
        _this.happnerClient.emit('disconnected');
      }
      _this.happnerClient.emit('reconnecting', opts);
    });

    _this.happnerClient.emit('connected');
    _this.connected = true;

    callback()
  });
};

ConnectionProvider.prototype.disconnect = function (callback) {
  var _this = this;
  if (!this.__client) return callback();

  if (this.__onConnectionEnded) {
    this.__client.offEvent(this.__onConnectionEnded);
  }

  if (this.__onReconnectSuccessful) {
    this.__client.offEvent(this.__onReconnectSuccessful);
  }

  if (this.__onReconnectScheduled) {
    this.__client.offEvent(this.__onReconnectScheduled);
  }

  this.__client.disconnect(function (e) {
    _this.__client = undefined;
    callback(e);
  });
};
