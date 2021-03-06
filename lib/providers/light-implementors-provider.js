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
    // this.dependencies = {};
    // this.descriptions = [];
    this.maps = {};

    this.name = opts.name || opts.domain;
    this.domain = opts.domain || opts.name;
    this.sessionId = undefined;
    this.secure = opts.secure;

    this.reconnectedHandler = undefined;
    this.addPeerHandler = undefined;
    this.removePeerHandler = undefined;

    // got all "starting" descriptions from peers already present at join time
    // this.gotDescriptions = true;
    // pending list of descriptions we're waiting for
    // this.awaitingDescriptions = {};
    happnerClient.on('reconnected', (this.reconnectedHandler = this.reconnected.bind(this)));
  }

  LightImplementorsProvider.prototype.clear = function() {
    this.maps = {};
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
