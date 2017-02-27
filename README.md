[![npm](https://img.shields.io/npm/v/happner-client.svg)](https://www.npmjs.com/package/happner-client)[![Build Status](https://travis-ci.org/happner/happner-client.svg?branch=master)](https://travis-ci.org/happner/happner-client)[![Coverage Status](https://coveralls.io/repos/happner/happner-client/badge.svg?branch=master&service=github)](https://coveralls.io/github/happner/happner-client?branch=master)

# happner-client

The client for happner-2 and happner cluster services.

`npm install happner-client`

## Usage

### Create client instance.

```javascript
var HappnerClient = require('happner-client');
var client = new HappnerClient({
  requestTimeout: 10 * 1000, // milliseconds timeout on api request (set ack)
  responseTimeout: 20 * 1000, // timeout awaiting response
  logger: null // optional happner-logger
});
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
  // multiple connections not yet supported
  //{
  //  name: 'ConnectionName2',
  //  host: 'hostname_ip',
  //  port: Number,
  //  protocol: 'https',
  //  username: 'username',
  //  password: 'password',
  //}
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



## Browser usage

Assuming served from [happner-2](https://github.com/happner/happner-2) packaged `/api/client` script

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Title</title>
  
  <!-- includes Happner.HappnerClient -->
  <script src="/api/client"></script>

  </head>
<body>

  <script>

    var client = new Happner.HappnerClient({
      requestTimeout: 10 * 1000,
      responseTimeout: 20 * 1000
    });

    var model = {
      'component': {
        version: '^2.0.0',
        methods: {
          method1: {}
        }
      }
    };

    var api = client.construct(model);

    client.connect()

      .then(function () {
        // subscribe to events (requires connected)
        api.event.component.on('test/event', function (data, meta) {
          console.log('EVENT', meta.path);
        });
      })

      .catch(function (error) {
        console.error('connection error', error);
      });
    
    // repeat call on exchange
    setInterval(function () {

      api.exchange.component.method1()
        .then(function (reply) {
          console.log('REPLY', reply);
        })
        .catch(function (error) {
          console.error('ERROR', error);
        });

    }, 1000);

  </script>

</body>
</html>
```

