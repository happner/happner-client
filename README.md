[![npm](https://img.shields.io/npm/v/happner-client.svg)](https://www.npmjs.com/package/happner-client)[![Build Status](https://travis-ci.org/happner/happner-client.svg?branch=master)](https://travis-ci.org/happner/happner-client)[![Coverage Status](https://coveralls.io/repos/happner/happner-client/badge.svg?branch=master&service=github)](https://coveralls.io/github/happner/happner-client?branch=master)

# happner-client

The client for happner-2 and happner cluster services.

`npm install happner-client`

## Usage

### Create client instance.

```javascript
var HappnerClient = require('happner-client');
var client = new HappnerClient();
```

### Connect

Connect with array of possible servers, randomly selected until successful.

```javascript
var optionalInfo = {
  // meta data for login
  ///////////////////// in $origin
}
client.connect([
  {
    name: 'ConnectionName1',
    host: 'localhost',
    port: 55000,
    protocol: 'https',
  	username: '_ADMIN',
    password: 'happn',
    allowSelfSignedCerts: true
  },
  {
    name: 'ConnectionName2',
    host: 'hostname_ip',
    port: Number,
    protocol: 'https',
    username: 'username',
    password: 'password',
  }
], optionalInfo).then(...).catch(...); // also supports callback
```

### Events

```javascript
client.on('connected', function () {
  // event fired on successful connection to server
});

client.on('reconnected', function () {
  // event fired on successful reconnection to server
});

client.on('disconnected', function () {
  // event fired when disconnected from server
});

client.on('reconnecting', function () {
  // event fired when attempting to reconnect
});

client.on('error', function (e) {
  // includes model verification mismatches
});
```

### Construct your API

```javascript
var kitchenModel = {
  fridge: {
    version: '^1.0.0',
    methods: {
      getTemperature: {
        // optional parameters for clientside validation
        params: [
          {name: 'shelves', type: 'array'}
        ]
      } 
    }
  }
};

var kitchen = client.construct(kitchenModel);
```

### Use API functions

```javascript
// with callback
kitchen.exchange.fridge.getTemperature(['top', 'middle'], function (e, temps) {});

// with promise
kitchen.exchange.fridge.getTemperature(['top', 'middle'])
	.then(function (temps) {})
	.catch(function (e) {})
```

### Listen to API events

```javascript
kitchen.event.fridge.on('/eventName', function (data) {});
```

### Access data

```javascript
kitchen.data[set(), get(), etc.] // see happner/happn-3
```

