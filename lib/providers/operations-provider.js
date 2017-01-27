module.exports = OperationProvider;

function OperationProvider(happnerClient, connection) {
  this.connection = connection;

  this.description = undefined;
}


OperationProvider.prototype.run = function (component, version, method, args, callback) {

};
