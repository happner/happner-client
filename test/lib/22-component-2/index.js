module.exports = Component;

function Component() {
}

Component.prototype.start = function ($happn, callback) {
  this.interval = setInterval(function () {
    $happn.emit('event/one', {DATA: 1});
  }, 100);
  callback();
};

Component.prototype.stop = function ($happn, callback) {
  clearInterval(this.interval);
  callback();
};
