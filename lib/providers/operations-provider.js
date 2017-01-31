module.exports = OperationProvider;

var Promise = require('bluebird');

function OperationProvider(happnerClient, connection, implementors) {
  Object.defineProperty(this, 'happnerClient', {value: happnerClient});
  this.connection = connection;
  this.implementors = implementors;
  this.responsePathsSubscribed = {};
  this.lastSeq = 0;
  this.awaitingResponses = {};
}


OperationProvider.prototype.request = function (component, version, method, args, callback) {

  var _this = this, implementation;

  if (!this.connection.connected) {
    return callback(new Error('Not connected'));
  }

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

    if (!_this.connection.connected) {
      return reject(new Error('Not connected'));
    }

    var requestSequence = _this.nextSeq();

    var requestPath = '/_exchange/requests/' +
      _this.implementors.domain +
      '/' + component +
      '/' + method;

    var responsePath, requestArgs;

    if (_this.connection.client.session.happn.secure) {

      /*
       secure:
       { callbackAddress: '/_exchange/responses/SERVER_NAME/example/method/1c123c7f-460d-4d9c-a845-0f48f2e6ae63/1161',
       args: [ { params: 1 } ],
       origin:
       { id: '1c123c7f-460d-4d9c-a845-0f48f2e6ae63',
       username: '_ADMIN' } }
       */

      responsePath = '/_exchange/responses/' +
        _this.implementors.domain +
        '/' + component + '/' + method +
        '/' + _this.connection.client.session.id +
        '/' + requestSequence;

      requestArgs = {
        callbackAddress: responsePath,
        args: args,
        origin: {
          id: _this.connection.client.session.id,
          username: _this.connection.client.session.user.username
        }
      };
    } else {
      /*
       insecure:
       { callbackAddress: '/_exchange/responses/2733eb5a-1f5e-4af1-9a8e-026653e47f5f/SERVER_NAME/example/method/11',
       args: [ { params: 1 } ],
       origin: { id: '2733eb5a-1f5e-4af1-9a8e-026653e47f5f' } }
       */

      responsePath = '/_exchange/responses/' +
        _this.connection.client.session.id +
        '/' + _this.implementors.domain +
        '/' + component + '/' + method +
        '/' + requestSequence;

      requestArgs = {
        callbackAddress: responsePath,
        args: args,
        origin: {
          id: _this.connection.client.session.id,
        }
      };
    }

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


OperationProvider.prototype.response = function () {
  // TODO: as handler for response

  // TODO: handle missing references per timeout deleted them
  // TODO: clear the request timeout

};


OperationProvider.prototype.subscribeToResponsePaths = function (component, method) {
  var _this = this;
  return new Promise(function (resolve, reject) {
    // subscribe to response paths
    // insecure: /_exchange/responses/bd826ed2-d9d6-4ca0-9b74-9cb0484432e2/*
    // secure: /_exchange/responses/SERVER_NAME/example/method/f16de5bb-bb62-48f9-b34a-9262b5f5d12b/*

    var path = '/_exchange/responses/';

    if (!_this.connection.connected) {
      return reject(new Error('Not connected'));
    }

    path += _this.connection.client.session.happn.secure
      ? _this.implementors.name + '/' + component + '/' + method + '/' + _this.connection.client.session.id + '/*'
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
      return;
    });
  });
};
