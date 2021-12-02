(function(isBrowser) {
  if (isBrowser) {
    Happner.LightImplementorsProvider = LightImplementorsProvider;
  } else {
    module.exports = LightImplementorsProvider;
  }

  function LightImplementorsProvider(happnerClient, connection, opts) {
    Object.defineProperty(this, 'happnerClient', {
      value: happnerClient
    });
    this.log = happnerClient.log;
    this.connection = connection;

    this.maps = {};

    this.name = opts.name || opts.domain;
    this.domain = opts.domain || opts.name;
    this.sessionId = undefined;
    this.secure = false;

    this.reconnectedHandler = undefined;
    this.addPeerHandler = undefined;
    this.removePeerHandler = undefined;

    happnerClient.on('reconnected', (this.reconnectedHandler = this.reconnected.bind(this)));
    happnerClient.on('connected', (this.connected = this.connected.bind(this)));
  }

  LightImplementorsProvider.prototype.clear = function() {
    this.maps = {};
  };

  LightImplementorsProvider.prototype.connected = function() {
    this.clear();
    this.sessionId = this.connection.client.session.id;
    this.secure = this.connection.client.session.happn.secure;
  };

  LightImplementorsProvider.prototype.reconnected = function() {
    this.clear();
    this.sessionId = this.connection.client.session.id;
  };

  LightImplementorsProvider.prototype.stop = function() {
    this.happnerClient.removeListener('reconnected', this.reconnectedHandler);
    this.clear();
  };

  LightImplementorsProvider.prototype.getDescriptions = function() {
    var _this = this;
    return new Promise(function(resolve, reject) {
      if (!_this.connection.connected) {
        return reject(new Error('Not connected'));
      }
      return resolve();
    });
  };

  LightImplementorsProvider.prototype.notImplementedError = function(
    componentName,
    version,
    methodName
  ) {
    return new Error('Not implemented ' + componentName + ':' + version + ':' + methodName);
  };

  LightImplementorsProvider.prototype.getNextImplementation = function(
    componentName,
    version,
    methodName
  ) {
    return new Promise((resolve, reject) => {
      if (!this.connection.connected) {
        return reject(new Error('Not connected'));
      }
      const mapKey = componentName + '/' + version + '/' + methodName;
      let implementation = this.maps[mapKey];
      if (!implementation)
        this.maps[mapKey] = {
          local: true
        };
      return resolve(this.maps[mapKey]);
    });
  };
})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);
