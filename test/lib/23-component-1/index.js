module.exports = Component;

function Component() {
}

Component.prototype.causeEvent = function ($happn, key, callback) {
  $happn.emit(key, {DATA: 1}, callback);
};
