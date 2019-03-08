(function (isBrowser) {

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

    inherits = function (subclass, superclass) {
      Object.keys(superclass.prototype).forEach(function (method) {
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
    Promise = require('bluebird');
    Promisify = require('./utils/promisify');
    semver = require('./semver');

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
    this.__connection = new ConnectionProvider(this);
    this.__implementors = new ImplementorsProvider(this, this.__connection);
    this.__operations = new OperationsProvider(this, this.__connection, this.__implementors);
    this.__requestTimeout = typeof opts.requestTimeout == 'number' ? opts.requestTimeout : 10 * 1000;
    this.__responseTimeout = typeof opts.responseTimeout == 'number' ? opts.responseTimeout : 20 * 1000;
  }

  inherits(HappnerClient, EventEmitter);

  HappnerClient.prototype.connect = Promise.promisify(function (connections, options, callback) {
    this.__connection.connect(connections, options, callback);
  });

  HappnerClient.prototype.disconnect = function (callback) {
    this.__connection.disconnect(callback);
    // TODO: call clear
    this.__operations.stop();
    this.__implementors.stop();
  };

  HappnerClient.prototype.dataClient = function(){
    return this.__connection.client;
  };

  HappnerClient.prototype.mount = function (orchestrator) {
    var _this = this;
    this.__connection.mount(orchestrator);
    this.__implementors.subscribeToPeerEvents();
    this.__implementors.getDescriptions().catch(function (e) {
      // cannot make mount() async because plugins in happner load before component
      // so the description is not ready so get descriptions will fail to do so
      // indefinately

      // set to retry
      _this.__implementors.callersAwaitingDescriptions = [];
      _this.log.error(e);
    });
  };

  HappnerClient.prototype.unmount = function () {
    // TODO: call clear
    this.__operations.stop();
    this.__implementors.unsubscribeFromPeerEvents();
    this.__implementors.stop();
  };

  HappnerClient.prototype.construct = function (model, $happn) {
    var _this = this;

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
        if (semver.satisfies(api.exchange[componentName].__version, component.version)) {
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

  HappnerClient.prototype.__mountExchange = function (api, componentName, version, methodName) {
    var _this = this;
    api.exchange[componentName][methodName] = Promisify(function () {
      var args = Array.prototype.slice.call(arguments);
      var callback = args.pop();

      _this.__operations.request(componentName, version, methodName, args, callback);
    });
  };

  HappnerClient.prototype.__mountEvent = function (api, componentName, version) {
    var _this = this;
    api.event[componentName].on = function (key, handler, callback) {
      if (!callback) callback = function (e) {
        if (e) _this.log.warn('subscribe to \'%s\' failed', key, e);
      };

      _this.__operations.subscribe(componentName, version, key, handler, callback);
    };

    api.event[componentName].off = function (id, callback) {
      if (!callback) callback = function (e) {
        if (e) _this.log.warn('unsubscribe from \'%s\' failed', id, e);
      };

      _this.__operations.unsubscribe(id, callback);
    };

    api.event[componentName].offPath = function (key, callback) {
      if (!callback) callback = function (e) {
        if (e) _this.log.warn('unsubscribe from \'%s\' failed', key, e);
      };

      _this.__operations.unsubscribePath(componentName, key, callback);
    };
  };

})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);
