# Node-voldemort (WIP)
[Voldemort](http://github.com/voldemort/voldemort) is the open source fork of Amazon DynamoDB, which
is a distributed key-value store.

This project aims to provide a NodeJS driver for Voldemort, to allow you to roll your own
instances without AWS.


# Installation
```
npm install voldemort
```

# Documentation
The client is based on [the official client spec](https://github.com/voldemort/voldemort/wiki/Writing-own-client-for-Voldemort).

Example (error-handling left out for brevity):
```js
var voldemort = require('voldemort');
var Client = voldemort('myProducts');
Client.bootstrap([{host: 'localhost', port: 6666}], function(err, client) {
  client.get('product1', function(err, product) {
    console.log(product.value);   //Buffer value
    console.log(product.version); //VectorClock
  });
});
```


## API

### Voldemort#bootstrap(hosts, [options,] done)
Returns a new voldemort client instance bootstrapped against the list of hosts.
Will initialize cluster information against the first working host.

Options include:
  * `store:string`: default store for this client
  * `timeout:integer`: timeout requests after `n` ms

### voldemort#get
### voldemort#getAll


### voldemort#put


### voldemort#del
