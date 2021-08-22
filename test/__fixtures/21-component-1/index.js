module.exports = Component;

function Component() {}

Component.prototype.methodReturningOneArg = function(arg1, callback) {
  callback(null, arg1);
};

Component.prototype.methodReturningTwoArgs = function(arg1, arg2, callback) {
  callback(null, arg1, arg2);
};

Component.prototype.methodReturningError = function(callback) {
  callback(new Error('Component error'));
};

Component.prototype.methodThatTimesOut = function(callback) {
  setTimeout(function() {
    callback(null);
  }, 6e3);
};

Component.prototype.exec = function($happn, eventKey, callback) {
  $happn.emit(eventKey, { DATA: 1 }, function(e) {
    callback(e);
  });
};

Component.prototype.getVersion = function($happn, callback) {
  callback(null, $happn.exchange.componentName.__version);
};
