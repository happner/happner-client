[![npm](https://img.shields.io/npm/v/happner-client.svg)](https://www.npmjs.com/package/happner-client)[![Build Status](https://travis-ci.org/happner/happner-client.svg?branch=master)](https://travis-ci.org/happner/happner-client)[![Coverage Status](https://coveralls.io/repos/happner/happner-client/badge.svg?branch=master&service=github)](https://coveralls.io/github/happner/happner-client?branch=master)

# happner-client

The client for happner-2 and happner cluster services.

`npm install happner-client`

## Usage

```javascript
var HappnerClient = require('happner-client');
var client = new HappnerClient();

client.on('connected', function () {
  // event fired on successful connection/reconnection to server
});

client.on('disconnected', function () {
  // event fired when disconnected from server
});

client.on('reconnecting', function () {
  // event fired when attempting to reconnect
});

// connect with array of possible servers, randomly selected until successful
client.connect([
  {
    name: 'connectionName1',
    url: 'https://ip:port',
    username: 'username',
    password: 'password',
    info: {}
  },
  {
    name: 'connectionName2',
    url: 'https://ip:port',
    username: 'username',
    password: 'password',
    info: {}
  }
]);

// declare model for api construction
var kitchenModel = {
  fridge: {
    version: '^1.0.0',
    getTemperature: {
      params: [
        {name: 'shelves', type: 'array'}
      ]
    }
  }
};

// create api
var kitchen = client.construct(kitchenModel);

// use api function call (with callback)
kitchen.exchange.fridge.getTemperature(['top', 'middle'], function (e, temps) {});

// use api function call (with promise)
kitchen.exchange.fridge.getTemperature(['top', 'middle'])
	.then(function (temps) {})
	.catch(function (e) {})

// listen to fridge events
kitchen.event.fridge.on('/eventName', function (data) {});

// access data
kitchen.data[set(), get(), etc.] // see happner/happn-3
```

