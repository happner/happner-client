(function(isBrowser) {
  var EventEmitter;
  var inherits;
  // var Promise; // bluebird already loaded when using /api/client
  var Promisify;
  var semver;

  var ConnectionProvider;
  var ImplementorsProvider;
  var OperationsProvider;
  var Logger;

  if (isBrowser) {
    // window.Happner already defined in /api/client
    Happner.LightHappnerClient = LightHappnerClient;

    EventEmitter = Primus.EventEmitter;

    inherits = function(subclass, superclass) {
      Object.keys(superclass.prototype).forEach(function(method) {
        subclass.prototype[method] = superclass.prototype[method];
      });
    };

    Promisify = Happner.Promisify; // already defined in /api/client
    semver = Happner.semver;
    ConnectionProvider = Happner.ConnectionProvider;
    ImplementorsProvider = Happner.LightImplementorsProvider;
    OperationsProvider = Happner.OperationsProvider;

    Logger = {
      createLogger: Happner.createLogger
    };
  } else {
    module.exports = LightHappnerClient;

    EventEmitter = require('events').EventEmitter;
    inherits = require('util').inherits;
    Promisify = require('./utils/promisify');
    semver = require('./semver');

    ConnectionProvider = require('./providers/connection-provider');
    ImplementorsProvider = require('./providers/light-implementors-provider');
    OperationsProvider = require('./providers/operations-provider');
    Logger = require('./logger'); // TODO: actual logger
  }

  function LightHappnerClient(opts) {
    if (!opts) throw new Error('light client requires opts object');
    if (typeof opts.name !== 'string' && typeof opts.domain !== 'string')
      throw new Error('light client requires opts.domain setting');

    if (isBrowser) EventEmitter.call(this);

    this.__logger = opts.logger || Logger;
    this.log = this.__logger.createLogger('LightHappnerClient');
    this.__connection = new ConnectionProvider(this);
    this.__implementors = new ImplementorsProvider(this, this.__connection, opts);
    this.__operations = new OperationsProvider(this, this.__connection, this.__implementors);
    this.__requestTimeout =
      typeof opts.requestTimeout === 'number' ? opts.requestTimeout : 60 * 1000;
    this.__responseTimeout =
      typeof opts.responseTimeout === 'number' ? opts.responseTimeout : 120 * 1000;

    this.exchange = { $call: this.__exchangeCall.bind(this) };
    this.event = this.__mountEvent({});
  }

  inherits(LightHappnerClient, EventEmitter);

  LightHappnerClient.prototype.connect = Promisify(function(connection, options, callback) {
    this.__connection.connect(connection, options, e => {
      if (e) return callback(e);
      this.__implementors.sessionId = this.__connection.client.session.id;
      callback();
    });
  });

  LightHappnerClient.prototype.disconnect = function(callback) {
    this.__connection.disconnect(callback);
    // TODO: call clear
    this.__operations.stop();
    this.__implementors.stop();
  };

  LightHappnerClient.prototype.dataClient = function() {
    return this.__connection.client;
  };

  LightHappnerClient.prototype.mount = function(orchestrator) {
    this.__connection.mount(orchestrator);
  };

  LightHappnerClient.prototype.unmount = function() {
    // TODO: call clear
    this.__operations.stop();
    this.__implementors.stop();
  };

  LightHappnerClient.prototype.__exchangeCall = function(parameters, callback) {
    if (!callback)
      return new Promise((resolve, reject) => {
        this.__operations.request(
          parameters.component,
          parameters.version || '*',
          parameters.method,
          parameters.arguments,
          (...args) => {
            if (args[0] != null) return reject(args[0]);
            if (args.length === 1) return resolve(null);
            if (args.length === 2) return resolve(args[1]);
            resolve(args.slice(1));
          },
          parameters.origin
        );
      });
    this.__operations.request(
      parameters.component,
      parameters.version || '*',
      parameters.method,
      parameters.arguments,
      (...args) => {
        if (args[0] != null) return callback(args[0]);
        if (args.length === 1) return callback(null, null);
        if (args.length === 2) return callback(null, args[1]);
        callback(...args);
      },
      parameters.origin
    );
  };

  LightHappnerClient.prototype.construct = function(model, $happn) {
    if (typeof model !== 'object') throw new Error('Missing model');

    var api = $happn || {
      exchange: {},
      event: {}
    };

    var componentNames = Object.keys(model);
    for (var i = 0; i < componentNames.length; i++) {
      var componentName = componentNames[i];
      var component = model[componentName];

      if (!component.version) throw new Error('Missing version');

      // $happn.event APIs are always replaced to become version aware

      api.event[componentName] = {};
      this.__mountEvent(api, componentName, component.version);

      // $happn.exchange are only replaced if the existing local component is wrong version

      if (api.exchange[componentName]) {
        if (!api.exchange[componentName].__version) continue;
        if (semver.coercedSatisfies(api.exchange[componentName].__version, component.version)) {
          continue;
        }
      }

      if ($happn) {
        this.__implementors.registerDependency($happn.name, componentName, component.version);
      }

      api.exchange[componentName] = {
        __version: component.version
      };

      if ($happn) {
        // used in happner._createElement() and _destroyElement() to not remove
        // this component when adding or removing elements from the local mesh
        api.exchange[componentName].__custom = true;
      }

      if (!component.methods) continue;

      if (typeof component.methods !== 'object') throw new Error('Missing methods');

      var methodNames = Object.keys(component.methods);
      for (var j = 0; j < methodNames.length; j++) {
        var methodName = methodNames[j];
        this.__mountExchange(api, componentName, component.version, methodName);
      }
    }

    return api;
  };

  LightHappnerClient.prototype.__mountExchange = function(api, componentName, version, methodName) {
    var _this = this;
    api.exchange[componentName][methodName] = Promisify(function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = args.pop();
      _this.__operations.request(
        componentName,
        version,
        methodName,
        args,
        callback,
        this.$origin || callback.$origin
      );
    });
  };

  LightHappnerClient.prototype.__mountEvent = function() {
    const _this = this;
    const eventAPI = {
      $on: function(parameters, handler, callback) {
        if (!callback)
          return new Promise((resolve, reject) => {
            _this.__operations.subscribe(
              parameters.component,
              parameters.version || '*',
              parameters.path,
              handler,
              (e, response) => {
                if (e) {
                  _this.log.warn("subscribe to '%s' failed", parameters.path, e);
                  return reject(e);
                }
                resolve(response);
              },
              parameters.options
            );
          });
        _this.__operations.subscribe(
          parameters.component,
          parameters.version || '*',
          parameters.path,
          handler,
          callback,
          parameters.options
        );
      },
      $once: function(parameters, handler, callback) {
        if (!parameters.options) parameters.options = {};
        parameters.options.count = 1;
        return eventAPI.$on(parameters, handler, callback);
      },
      $off: function(id, callback) {
        if (!callback)
          return new Promise((resolve, reject) => {
            _this.__operations.unsubscribe(id, (e, response) => {
              if (e) {
                _this.log.warn("unsubscribe from '%s' failed", id, e);
                return reject(e);
              }
              resolve(response);
            });
          });
        _this.__operations.unsubscribe(id, callback);
      },
      $offPath: function(parameters, callback) {
        if (!callback)
          return new Promise((resolve, reject) => {
            _this.__operations.unsubscribePath(
              parameters.component,
              parameters.path,
              (e, response) => {
                if (e) {
                  `unsubscribe from [${parameters.component}:${parameters.path}] failed: ${e.message}`;
                  return reject(e);
                }
                resolve(response);
              }
            );
          });
        _this.__operations.unsubscribePath(parameters.component, parameters.path, callback);
      }
    };
    return eventAPI;
  };
})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);
