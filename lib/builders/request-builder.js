(function (isBrowser) {

  if (isBrowser) {
    Happner.RequestBuilder = RequestBuilder;
  } else {
    module.exports = RequestBuilder;
  }

  function RequestBuilder() {
    this.reset();
  }

  RequestBuilder.prototype.reset = function () {
    this.component = undefined;
    this.domain = undefined;
    this.method = undefined;
    this.sequence = undefined;
    this.args = undefined;
    this.id = undefined;
    this.username = undefined;
    this.isSecure = undefined;
    this.callbackPeer = undefined;
  };

  RequestBuilder.prototype.withComponent = function (component) {
    this.component = component;
    return this;
  };

  RequestBuilder.prototype.withDomain = function (domain) {
    this.domain = domain;
    return this;
  };

  RequestBuilder.prototype.withMethod = function (method) {
    this.method = method;
    return this;
  };

  RequestBuilder.prototype.withSequence = function (sequence) {
    this.sequence = sequence;
    return this;
  };

  RequestBuilder.prototype.withArgs = function (args) {
    this.args = args;
    return this;
  };

  RequestBuilder.prototype.withSessionId = function (id) {
    this.id = id;
    return this;
  };

  RequestBuilder.prototype.withUsername = function (username) {
    this.username = username;
    return this;
  };

  RequestBuilder.prototype.withIsSecure = function (isSecure) {
    this.isSecure = isSecure;
    return this;
  };

  RequestBuilder.prototype.withCallbackPeer = function (callbackPeer) {
    this.callbackPeer = callbackPeer;
    return this;
  };

  RequestBuilder.prototype.build = function () {

    var requestArgs = {
      callbackAddress: undefined,
      args: this.args,
      origin: {
        id: this.id
      }
    };

    if (this.callbackPeer) requestArgs.callbackPeer = this.callbackPeer;

    switch (this.isSecure) {
      case true:
        requestArgs.callbackAddress = '/_exchange/responses/' + this.domain + '/' + this.component +
          '/' + this.method + '/' + this.id + '/' + this.sequence;
        requestArgs.origin.username = this.username;

        break;
      default:
        requestArgs.callbackAddress = '/_exchange/responses/' + this.id + '/' + this.domain +
          '/' + this.component + '/' + this.method + '/' + this.sequence;
    }

    this.reset();

    return requestArgs;
  };

})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);


