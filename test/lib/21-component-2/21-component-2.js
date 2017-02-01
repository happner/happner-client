
module.exports = Component;

function Component() {
}

Component.prototype.methodReturningOneArg = function (arg1, callback) {
  callback(null, arg1);
};

Component.prototype.methodReturningTwoArgs = function (arg1, arg2, callback) {
  callback(null, arg1, arg2);
};

Component.prototype.methodReturningError = function (callback) {
  callback(new Error('Component error'));
};



