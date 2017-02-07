module.exports = Component;

function Component() {
}

Component.prototype.start = function ($happn, callback) {
  this.interval = setInterval(function () {
    $happn.emit('event/one', {DATA: 1});
  }, 77);
  callback();
};

Component.prototype.stop = function (callback) {
  clearInterval(this.interval);
  callback();
};



Component.prototype.method1 = function (callback) {
  callback();
};

