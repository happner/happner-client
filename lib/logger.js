module.exports = {
  createLogger: function (context) {
    return {
      fatal: function () {
        var args = Array.prototype.slice.call(arguments);
        var string = args.shift();
        string = '[%s] (%s) ' + string;
        args.unshift(context);
        args.unshift('FATAL');
        args.unshift(string);
        console.error.apply(console, args);
      },
      error: function () {
        var args = Array.prototype.slice.call(arguments);
        var string = args.shift();
        string = '[%s] (%s) ' + string;
        args.unshift(context);
        args.unshift('ERROR');
        args.unshift(string);
        console.error.apply(console, args);
      },
      warn: function () {
        var args = Array.prototype.slice.call(arguments);
        var string = args.shift();
        string = '[%s] (%s) ' + string;
        args.unshift(context);
        args.unshift(' WARN');
        args.unshift(string);
        console.error.apply(console, args);
      },
      info: function () {
        var args = Array.prototype.slice.call(arguments);
        var string = args.shift();
        string = '[%s] (%s) ' + string;
        args.unshift(context);
        args.unshift(' INFO');
        args.unshift(string);
        console.info.apply(console, args);
      }
    }
  }
};
