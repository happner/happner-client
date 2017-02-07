module.exports = OperationProvider;

var Promise = require('bluebird');
var semver = require('semver');
var RequestBuilder = require('../builders/request-builder');

function OperationProvider(happnerClient, connection, implementors) {
  Object.defineProperty(this, 'happnerClient', {value: happnerClient});
  this.connection = connection;
  this.implementors = implementors;
  this.responsePathsSubscribed = {};
  this.lastSeq = 0;
  this.awaitingResponses = {};
  this.requestBuilder = new RequestBuilder();
}

OperationProvider.prototype.connected = function (callback) {
  if (!this.connection.connected) {
    callback(new Error('Not connected'));
    return false;
  }
  return true;
};


OperationProvider.prototype.subscribe = function(component, version, key, handler, callback) {

  var _this = this, implementation;

  if (!this.connected(callback)) return;

  var filterByVersion = function (data, meta) {
    if (meta.componentVersion) { // inserted by happner $happn.emit()
      if (!semver.satisfies(meta.componentVersion, version)) return;
    }

    handler(data, meta);
  };

  Promise.resolve()

    .then(function () {
      // get description for domain name
      return _this.implementors.getDescriptions();
    })

    .then(function () {
      var path = '/_events/' + _this.implementors.domain + '/' + component + '/' + key;
      _this.connection.client.on(path, {event_type: 'set'}, filterByVersion, callback);
    })

    .catch(callback);

};

OperationProvider.prototype.unsubscribe = function(id, callback) {

  if (!this.connected(callback)) return;

  this.connection.client.off(id, callback);

};

OperationProvider.prototype.unsubscribePath = function(component, key, callback) {

  var _this = this, implementation;

  if (!this.connected(callback)) return;

  Promise.resolve()

    .then(function () {
      // get description for domain name
      return _this.implementors.getDescriptions();
    })

    .then(function () {
      var path = '/_events/' + _this.implementors.domain + '/' + component + '/' + key;
      _this.connection.client.offPath(path, callback);
    })

    .catch(callback);

};

OperationProvider.prototype.request = function (component, version, method, args, callback) {

  var _this = this, implementation;

  if (!this.connected(callback)) return;

  Promise.resolve()

    .then(function () {
      return _this.implementors.getDescriptions();
    })

    .then(function () {
      return _this.implementors.getNextImplementation(component, version, method);
    })

    .then(function (_implementation) {
      implementation = _implementation;
      return _this.subscribeToResponsePaths(component, method);
    })

    .then(function () {
      // implementation.peer
      return _this.executeRequest(component, method, args, callback);
    })

    .catch(callback);

};


OperationProvider.prototype.nextSeq = function () {
  this.lastSeq++;
  if (this.lastSeq >= Number.MAX_SAFE_INTEGER) {
    this.lastSeq = 1;
  }
  return this.lastSeq;
};


OperationProvider.prototype.executeRequest = function (component, method, args, callback) {
  var _this = this;
  return new Promise(function (resolve, reject) {

    if (!_this.connected(reject)) return;

    var requestSequence = _this.nextSeq();

    var requestArgs = _this.requestBuilder.withComponent(component)
      .withDomain(_this.implementors.domain)
      .withMethod(method)
      .withSequence(requestSequence)
      .withArgs(args)
      .withSessionId(_this.connection.client.session.id)
      .withUsername(_this.connection.client.session.user ? _this.connection.client.session.user.username : null)
      .withIsSecure(_this.connection.client.session.happn.secure)
      .build();

    var requestPath = '/_exchange/requests/' +
      _this.implementors.domain +
      '/' + component +
      '/' + method;

    var requestOptions = {
      timeout: _this.happnerClient.__requestTimeout,
      noStore: true
    };

    _this.connection.client.set(requestPath, requestArgs, requestOptions, function (e) {
      if (e) return reject(e);

      _this.awaitingResponses[requestSequence] = {
        callback: callback,
        timeout: setTimeout(function () {
          delete _this.awaitingResponses[requestSequence];
          callback(new Error('Timeout awaiting response'));
        }, _this.happnerClient.__responseTimeout)
      };

      resolve();
    });

  });
};


OperationProvider.prototype.response = function (data, meta) {

  var sequence = meta.path.substr(meta.path.lastIndexOf('/') + 1);
  var handler = this.awaitingResponses[sequence];

  if (!handler) return;

  clearTimeout(handler.timeout);
  delete this.awaitingResponses[sequence];

  if (data.status == 'ok') return handler.callback.apply(this, data.args);

  var error = new Error(data.args[0].message);
  error.name = data.args[0].name;

  handler.callback(error);
};


OperationProvider.prototype.subscribeToResponsePaths = function (component, method) {
  var _this = this;
  return new Promise(function (resolve, reject) {
    // subscribe to response paths
    // insecure: /_exchange/responses/bd826ed2-d9d6-4ca0-9b74-9cb0484432e2/*
    // secure: /_exchange/responses/SERVER_NAME/example/method/f16de5bb-bb62-48f9-b34a-9262b5f5d12b/*

    var path = '/_exchange/responses/';

    if (!_this.connected(reject)) return;

    path += _this.connection.client.session.happn.secure
      ? _this.implementors.domain + '/' + component + '/' + method + '/' + _this.connection.client.session.id + '/*'
      : _this.connection.client.session.id + '/*';

    if (_this.responsePathsSubscribed[path] == true) return resolve();

    _this.responsePathsSubscribed[path] = _this.responsePathsSubscribed[path] || [];

    _this.responsePathsSubscribed[path].push({
      resolve: resolve,
      reject: reject
    });

    if (_this.responsePathsSubscribed[path].length > 1) return;

    _this.connection.client.on(path, _this.response.bind(_this), function (e) {
      var reply;
      if (e) {
        while (reply = _this.responsePathsSubscribed[path].shift()) {
          reply.reject(e);
        }
        return;
      }

      while (reply = _this.responsePathsSubscribed[path].shift()) {
        reply.resolve();
      }
      _this.responsePathsSubscribed[path] = true;
    });
  });
};
