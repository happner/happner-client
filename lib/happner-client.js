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
    Happner.HappnerClient = HappnerClient;

    EventEmitter = Primus.EventEmitter;

    inherits = function(subclass, superclass) {
      Object.keys(superclass.prototype).forEach(function(method) {
        subclass.prototype[method] = superclass.prototype[method];
      });
    };

    Promisify = Happner.Promisify; // already defined in /api/client
    semver = Happner.semver;
    ConnectionProvider = Happner.ConnectionProvider;
    ImplementorsProvider = Happner.ImplementorsProvider;
    OperationsProvider = Happner.OperationsProvider;

    Logger = {
      createLogger: Happner.createLogger
    };
  } else {
    module.exports = HappnerClient;

    EventEmitter = require('events').EventEmitter;
    inherits = require('util').inherits;
    Promisify = require('./utils/promisify');
    semver = require('happner-semver');

    ConnectionProvider = require('./providers/connection-provider');
    ImplementorsProvider = require('./providers/implementors-provider');
    OperationsProvider = require('./providers/operations-provider');
    Logger = require('./logger'); // TODO: actual logger
  }

  function HappnerClient(opts) {
    if (!opts) opts = {};

    if (isBrowser) EventEmitter.call(this);

    this.__logger = opts.logger || Logger;
    this.log = this.__logger.createLogger('HappnerClient');
    this.__apis = [];
    this.__connection = new ConnectionProvider(this);
    this.__implementors = new ImplementorsProvider(this, this.__connection);
    this.__operations = new OperationsProvider(this, this.__connection, this.__implementors);
    this.__requestTimeout =
      typeof opts.requestTimeout === 'number' ? opts.requestTimeout : 60 * 1000;
    this.__responseTimeout =
      typeof opts.responseTimeout === 'number' ? opts.responseTimeout : 120 * 1000;
    this.__opts = opts;
  }

  inherits(HappnerClient, EventEmitter);

  HappnerClient.prototype.connect = Promisify(function(connection, options, callback) {
    this.__connection.connect(connection, options, callback);
  });

  HappnerClient.prototype.disconnect = function(callback) {
    this.__connection.disconnect(callback);
    // TODO: call clear
    this.__operations.stop();
    this.__implementors.stop();
  };

  HappnerClient.prototype.dataClient = function() {
    return this.__connection.client;
  };

  HappnerClient.prototype.mount = function(orchestrator) {
    var _this = this;
    this.__connection.mount(orchestrator);
    this.__implementors.subscribeToPeerEvents();
    this.on('description/new', this.newDescription);
    this.__implementors.getDescriptions().catch(function(e) {
      // cannot make mount() async because plugins in happner load before component
      // so the description is not ready so get descriptions will fail to do so
      // indefinately

      // set to retry
      _this.__implementors.callersAwaitingDescriptions = [];
      _this.log.error(e);
    });
  };

  HappnerClient.prototype.unmount = function() {
    // TODO: call clear
    this.__operations.stop();
    this.__implementors.unsubscribeFromPeerEvents();
    this.__implementors.stop();
  };

  HappnerClient.prototype.onConnected = async function() {
    try {
      if (this.__opts.discoverMethods) {
        this.endPointDescription = await this.__connection.getDescription();
        this.log.info('fetched description: discover methods activated');
      }
    } catch (e) {
      this.log.error(e);
    }
  };

  HappnerClient.prototype.newDescription = function(description) {
    Object.keys(description.components).forEach(componentName => {
      if (['security', 'system', 'rest', 'api', 'data'].includes(componentName)) {
        return;
      }
      const component = description.components[componentName];
      this.newComponent({
        componentName: component.name,
        description: component,
        member: description.meshName
      });
    });
  };

  HappnerClient.prototype.newComponent = function(component) {
    this.__apis.forEach(api => {
      if (
        api.exchange[component.componentName] == null ||
        api.exchange[component.componentName].__discover
      ) {
        this.log.info(
          `mounting methods for discovered component on api [${api.id}]: [${component.componentName}], running on member: [${component.member}]`
        );
        this.__mountMethods(api, component.description, component.componentName);
      }
      if (api.event[component.componentName] == null) {
        this.log.info(
          `mounting events for discovered component on api [${api.id}]: [${component.componentName}], running on member: [${component.member}]`
        );
        //events have already been mounted by version
        this.__mountEvent(api, component.componentName, component.description.version);
      }
    });
  };

  HappnerClient.prototype.__decorateModelMethods = function(model) {
    Object.keys(model).forEach(componentName => {
      const foundComponent = this.endPointDescription.components[componentName];
      Object.keys(foundComponent.methods).forEach(methodName => {
        if (model[componentName].methods == null) model[componentName].methods = {};
        if (model[componentName].methods[methodName] == null) {
          model[componentName].methods[methodName] = foundComponent.methods[methodName];
        }
      });
    });
  };

  HappnerClient.prototype.construct = function(model, $happn) {
    if (typeof model !== 'object') throw new Error('Missing model');

    var api = $happn || {
      exchange: {},
      event: {}
    };

    api.id = this.__apis.length;

    if (this.__opts.discoverMethods) {
      this.__decorateModelMethods(model);
    }

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
        if (!api.exchange[componentName].__version) {
          this.log.warn(`no version for component: ${componentName}`);
          continue;
        }
        if (semver.coercedSatisfies(api.exchange[componentName].__version, component.version)) {
          this.log.warn(
            `component version compared - versions are compatible, component: [${componentName}] existing version: ${api.exchange[componentName].__version}, incoming version: ${component.version}`
          );
          continue;
        }
      }

      api.exchange[componentName] = {
        __version: component.version
      };

      if ($happn) {
        this.__implementors.registerDependency($happn.name, componentName, component.version);
        // used in happner._createElement() and _destroyElement() to not remove
        // this component when adding or removing elements from the local mesh
        api.exchange[componentName].__custom = true;
      }

      if (component.discoverMethods) {
        api.exchange[componentName].__discover = true;
        continue;
      }

      if (!component.methods) {
        continue;
      }

      if (typeof component.methods !== 'object') throw new Error('Missing methods');

      this.__mountMethods(api, component, componentName);
    }
    api.exchange.$call = this._createDecoupledCall(api.exchange);
    this.__apis.push(api);
    return api;
  };

  HappnerClient.prototype.getEndpoint = function(parameters, api, callback) {
    try {
      if (parameters.mesh) {
        if (typeof api[parameters.mesh] !== 'object')
          throw new Error(
            `invalid endpoint options: [${parameters.mesh}] mesh does not exist on the api`
          );
        if (typeof api[parameters.mesh][parameters.component] !== 'object')
          throw new Error(
            `invalid endpoint options: [${parameters.mesh}.${parameters.component}] component does not exist on the api`
          );
      } else {
        if (typeof api[parameters.component] !== 'object')
          throw new Error(
            `invalid endpoint options: [${parameters.component}] component does not exist on the api`
          );
      }
    } catch (e) {
      if (callback) {
        callback(e);
        return false;
      }
      throw e;
    }
    return parameters.mesh ? api[parameters.mesh][parameters.component] : api[parameters.component];
  };

  HappnerClient.prototype._createDecoupledCall = function(exchangeAPI) {
    const _this = this;
    return function(parameters, callback) {
      const endpoint = _this.getEndpoint(parameters, exchangeAPI, callback);
      if (endpoint === false) return;
      if (typeof endpoint[parameters.method] !== 'function') {
        const methodNotExistError = new Error(
          `invalid endpoint options: [${parameters.component}.${parameters.method}] method does not exist on the api`
        );
        if (typeof callback !== 'function') throw methodNotExistError;
        return callback(new Error(methodNotExistError));
      }
      const args = Array.isArray(parameters.arguments) ? parameters.arguments : [];
      if (typeof callback === 'function') args.push(callback);
      return endpoint[parameters.method].apply(endpoint, args);
    };
  };

  HappnerClient.prototype.__mountMethods = function(api, component, componentName) {
    Object.keys(component.methods).forEach(methodName => {
      this.__mountExchange(api, componentName, component.version, methodName);
    });
  };

  HappnerClient.prototype.__mountExchange = function(api, componentName, version, methodName) {
    var _this = this;
    if (!api.exchange[componentName]) api.exchange[componentName] = {};
    if (!api.exchange[componentName][methodName]) {
      this.log.info(
        `mounting method: [${componentName}.${methodName}] on api [${api.id}] with version: ${version}`
      );
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
    }
  };

  HappnerClient.prototype.__mountEvent = function(api, componentName, version) {
    var _this = this;
    if (!api.event[componentName]) api.event[componentName] = {};
    api.event[componentName].on = function(key, options, handler, callback) {
      if (typeof options === 'function') {
        callback = handler;
        handler = options;
        options = {};
      }
      if (callback == null) {
        callback = function(e) {
          if (e) _this.log.warn("subscribe to '%s' failed", key, e);
        };
      }
      _this.__operations.subscribe(componentName, version, key, handler, callback, options);
    };

    api.event[componentName].off = function(id, callback) {
      if (!callback)
        callback = function(e) {
          if (e) _this.log.warn("unsubscribe from '%s' failed", id, e);
        };

      _this.__operations.unsubscribe(id, callback);
    };

    api.event[componentName].offPath = function(key, callback) {
      if (!callback)
        callback = function(e) {
          if (e) _this.log.warn("unsubscribe from '%s' failed", key, e);
        };

      _this.__operations.unsubscribePath(componentName, key, callback);
    };
  };
})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);
