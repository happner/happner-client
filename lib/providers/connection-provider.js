// Provides either
// 1. happn client (standalone client)
// 2. orchestrator peers (in cluster)

module.exports = ConnectionProvider;

var Happn = require('happn-3');

function ConnectionProvider(happnerClient) {
  this.connected = false;

  var client;
  Object.defineProperty(this, 'client', {
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

    _this.client = client;

    _this.__onConnectionEnded = _this.client.onEvent('connection-ended', function () {
      _this.connected = false;
      _this.happnerClient.emit('disconnected');
    });

    _this.__onReconnectSuccessful = _this.client.onEvent('reconnect-successful', function () {
      _this.connected = true;
      _this.happnerClient.emit('reconnected');
      // TODO: clears description for given connection (or in disconnect)
    });

    _this.__onReconnectScheduled = _this.client.onEvent('reconnect-scheduled', function (opts) {
      if (_this.connected) {
        _this.connected = false;
        _this.happnerClient.emit('disconnected');
      }
      _this.happnerClient.emit('reconnecting', opts);
    });

    _this.happnerClient.emit('connected');
    _this.connected = true;

    console.log('\n\n\n', _this.client.session);

    callback()
  });
};

ConnectionProvider.prototype.disconnect = function (callback) {
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

  this.client.disconnect(function (e) {
    _this.client = undefined;
    callback(e);
  });
};
