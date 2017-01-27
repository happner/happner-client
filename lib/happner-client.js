module.exports = HappnerClient;

var EventEmitter = require('events').EventEmitter; // use Primus.EventEmitter in browser
var inherits = require('util').inherits;
var Promise = require('bluebird');

var ConnectionProvider = require('./providers/connection-provider');
var OperationsProvider = require('./providers/operations-provider');

function HappnerClient() {
  this.__connection = new ConnectionProvider(this);
  this.__operations = new OperationsProvider(this, this.__connection);
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

};
