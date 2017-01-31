module.exports = HappnerClient;

var EventEmitter = require('events').EventEmitter; // use Primus.EventEmitter in browser
var inherits = require('util').inherits;
var Promise = require('bluebird');
var Promisify = require('./utils/promisify');

var ConnectionProvider = require('./providers/connection-provider');
var ImplementorsProvider = require('./providers/implementors-provider');
var OperationsProvider = require('./providers/operations-provider');

function HappnerClient(opts) {
  if (!opts) opts = {};
  this.__connection = new ConnectionProvider(this);
  this.__implementors = new ImplementorsProvider(this, this.__connection);
  this.__operations = new OperationsProvider(this, this.__connection, this.__implementors);
  this.__requestTimeout = typeof opts.requestTimeout == 'number' ? opts.requestTimeout : 10 * 1000;
  this.__responseTimeout = typeof opts.responseTimeout == 'number' ? opts.responseTimeout : 10 * 1000;
}

inherits(HappnerClient, EventEmitter);

HappnerClient.prototype.connect = Promise.promisify(function (connections, info, callback) {
  this.__connection.connect(connections, info, callback)
});

HappnerClient.prototype.mount = function (orchestrator) {
};

HappnerClient.prototype.disconnect = function (callback) {
  this.__connection.disconnect(callback);
};

HappnerClient.prototype.construct = function (model) {
  var _this = this;

  if (typeof model !== 'object') throw new Error('Missing model');

  var api = {
    exchange: {}
  };

  var componentNames = Object.keys(model);
  for (var i = 0; i < componentNames.length; i++) {
    var componentName = componentNames[i];
    var component = model[componentName];

    api.exchange[componentName] = {};

    if (!component.version) throw new Error('Missing version');
    if (typeof component.methods !== 'object') throw new Error('Missing methods');

    var methodNames = Object.keys(component.methods);
    for (var j = 0; j< methodNames.length; j++) {
      var methodName = methodNames[j];

      api.exchange[componentName][methodName] = Promisify(function () {
        var args = Array.prototype.slice.call(arguments);
        var callback = args.pop();

        _this.__operations.request(componentName, component.version, methodName, args, callback);
      });
    }
  }

  return api;
};
