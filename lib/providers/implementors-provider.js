module.exports = ImplementorsProvider;

// TODO: peer departs: remove description and toss all maps to allow just-in-time rebuild

var Promise = require('bluebird');
var semver = require('semver');

function ImplementorsProvider(happnClient, connection) {
  this.connection = connection;
  this.awaitingDescription = [];
  this.descriptions = [];
  this.maps = {};
  this.domain = undefined;
}

ImplementorsProvider.prototype.getDescriptions = function() {
  var _this = this;
  return new Promise(function (resolve, reject) {

    if (!_this.connection.connected) {
      return reject(new Error('Not connected'));
    }

    if (_this.awaitingDescription === false) return resolve();

    _this.awaitingDescription = _this.awaitingDescription || [];

    _this.awaitingDescription.push({
      resolve: resolve,
      reject: reject
    });

    if (_this.awaitingDescription.length > 1) return;

    var fetch = function () {
      _this.connection.client.get('/mesh/schema/description', function (e, description) {
        var reply;

        if (e) {
          while (reply = _this.awaitingDescription.shift()) {
            reply.reject(e);
          }
          return;
        }

        if (description.initializing) return setTimeout(fetch, 1000);

        while (reply = _this.awaitingDescription.shift()) {
          reply.resolve();
        }

        _this.awaitingDescription = false;
        _this.maps = {};
        _this.descriptions.push(description);
        _this.domain = description.name;

      });
    };

    fetch();

  });
};

ImplementorsProvider.prototype.getNextImplementation = function (componentName, version, methodName) {
  var _this = this, mapKey, mapData;
  if (this.descriptions.length == 0) return Promise.reject(new Error('Missing description'));

  mapKey = componentName + '/' + version + '/' + methodName;
  if (mapData = this.maps[mapKey]) {
    if (mapData.length == 0) {
      return Promise.reject(new Error('Not implemented'));
    }
    return Promise.resolve(this.getNext(mapData));
  }

  mapData = [];

  this.descriptions.forEach(function (description) {
    var components = description.components;
    Object.keys(components).forEach(function (compName) {
      if (compName != componentName) return;

      var component = components[compName];
      if (!semver.satisfies(component.version, version)) return;

      Object.keys(component.methods).forEach(function (methName) {
        if (methName != methodName) return;
        mapData.push({local: true});
      });
    });
  });

  this.maps[mapKey] = mapData;

  if (mapData.length == 0) {
    return Promise.reject(new Error('Not implemented'));
  }

  return Promise.resolve(this.getNext(mapData));
};

ImplementorsProvider.prototype.getNext = function(array) {
  if (typeof array.__lastSequence == 'undefined') {
    array.__lastSequence = 0;
    return array[array.__lastSequence];
  }

  array.__lastSequence++;
  if (array.__lastSequence >= array.length) {
    array.__lastSequence = 0;
  }
  return array[array.__lastSequence];
};
