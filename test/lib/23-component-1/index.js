module.exports = Component1;

function Component1() {
}

Component1.prototype.start = function ($happn, callback) {

  this.interval = setInterval(function () {

    $happn.emit('event/one', {event: 1});
    $happn.emit('event/two', {event: 2});
    $happn.emit('event/three', {event: 3});

  }, 200);
  callback();

};

Component1.prototype.stop = function (callback) {

  clearInterval(this.interval);
  callback();

};
