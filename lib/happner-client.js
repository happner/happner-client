module.exports = HappnerClient;

var EventEmitter = require('events').EventEmitter; // use Primus.EventEmitter in browser
var inherits = require('util').inherits;
var Promise = require('bluebird');
var Promisify = require('./utils/promisify');
var semver = require('semver');

var ConnectionProvider = require('./providers/connection-provider');
var ImplementorsProvider = require('./providers/implementors-provider');
var OperationsProvider = require('./providers/operations-provider');
var Logger = require('./logger');

function HappnerClient(opts) {
  if (!opts) opts = {};

  this.__connection = new ConnectionProvider(this);
  this.__implementors = new ImplementorsProvider(this, this.__connection);
  this.__operations = new OperationsProvider(this, this.__connection, this.__implementors);
  this.__requestTimeout = typeof opts.requestTimeout == 'number' ? opts.requestTimeout : 10 * 1000;
  this.__responseTimeout = typeof opts.responseTimeout == 'number' ? opts.responseTimeout : 20 * 1000;
  this.__logger = opts.logger || Logger;
  this.log = this.__logger.createLogger('HappnerClient');
}

inherits(HappnerClient, EventEmitter);

HappnerClient.prototype.connect = Promise.promisify(function (connections, info, callback) {
  this.__connection.connect(connections, info, callback);
});

HappnerClient.prototype.mount = function (orchestrator) {
  this.__connection.mount(orchestrator);
  this.__implementors.subscribeToPeerEvents();
};

HappnerClient.prototype.disconnect = function (callback) {
  this.__connection.disconnect(callback);
};

HappnerClient.prototype.construct = function (model, $happner) {
  var _this = this;

  if (typeof model !== 'object') throw new Error('Missing model');

  var api = $happner || {
    exchange: {},
    event: {}
  };

  var componentNames = Object.keys(model);
  for (var i = 0; i < componentNames.length; i++) {
    var componentName = componentNames[i];
    var component = model[componentName];

    if (!component.version) throw new Error('Missing version');

    // $happner.event APIs are always replaced to become version aware

    api.event[componentName] = {};
    this.__mountEvent(api, componentName, component.version);

    // $happner.exchange are only replaced if the existing local component is wrong version

    if (api.exchange[componentName]) {
      if (!api.exchange[componentName].__version) continue;
      if (semver.satisfies(api.exchange[componentName].__version, component.version)) {
        continue;
      }
    }

    api.exchange[componentName] = {};

    if (!component.methods) continue;

    if (typeof component.methods !== 'object') throw new Error('Missing methods');

    var methodNames = Object.keys(component.methods);
    for (var j = 0; j< methodNames.length; j++) {
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
  api.event[componentName].on = function(key, handler, callback) {
    if (!callback) callback = function (e) {
      if (e) _this.log.warn('subscribe to \'%s\' failed', key, e);
    };

    _this.__operations.subscribe(componentName, version, key, handler, callback);
  };

  api.event[componentName].off = function(id, callback) {
    if (!callback) callback = function (e) {
      if (e) _this.log.warn('unsubscribe from \'%s\' failed', id, e);
    };

    _this.__operations.unsubscribe(id, callback);
  };

  api.event[componentName].offPath = function(key, callback) {
    if (!callback) callback = function (e) {
      if (e) _this.log.warn('unsubscribe from \'%s\' failed', key, e);
    };

    _this.__operations.unsubscribePath(componentName, key, callback);
  };
};
