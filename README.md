# Node-voldemort (WIP)
[Voldemort](http://github.com/voldemort/voldemort) is the open source fork of Amazon DynamoDB, which
is a distributed key-value store.

This project aims to provide a NodeJS driver for Voldemort, to allow you to roll your own
instances without AWS.

This project uses round robin load balancing, and does not support client-side routing of keyspace.

# Installation
```
npm install voldemort
```

Run tests with
```
npm test
```
Requires a voldemort instance running on `localhost` port `6666`.

# Documentation
The client is based on [the official client spec](https://github.com/voldemort/voldemort/wiki/Writing-own-client-for-Voldemort).

Example (error-handling left out for brevity):
```js
var Voldemort = require('voldemort');
// Create a client against local voldemort, with default store 'products'
Voldemort.bootstrap([{host: 'localhost', port: 6666}], {store: 'products'}, function(err, client) {
  // Retrieve 'product1' from 'products' store
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

Options:
  * `store:string` Set a default store for this client. If not set, store must
    be set with every request (`#get` etc).
  * `valueSerializer:Serializer` {serialize: fn(value), deserialize: fn(value)}
    Values are passed through `serialize` on insertion, and `deserialize` on retrieval.
    Defaults to returning raw buffer on retrieval.
  * `keySerializer:Serializer` {serialize: fn(value), deserialize: fn(value)}
    Keys are passed through `serialize` on insertion, and `deserialize` on retrieval.
    Defaults to string deserialization on retrieval.
  * `timeout:integer` Default `10000`. Timeout requests after `timeout` ms
  * `reconnectInterval:integer` Default `500`. Round robin batch size. The
    client will change node after this many requests to distribute load across
    the cluster.
  * `randomize:bool` Default `true`. Set to `false` to disable randomizing node
    selection in cluster. This will use the nodes in-order starting from the
    bootstrap node.

### voldemort#get(key, [options,] done)
Gets the value of `key` from the default store or `options.store` if set.
Returns [Versioned](proto/voldemort-client.proto#L22) or `null` if `key` doesn't exist.

Options:
  * `store:string` Store to query for `key`. Required if no default store is set in `#bootstrap`.
  * `shouldRoute:bool` Set to `false` to disable serverside routing.

### voldemort#getAll(keys, [options,] done)
Gets the values of `keys` from the default store or `options.store` if set.
Returns `Object({key: version})` or empty object if no `keys` exist.

Options:
  * `store:string` Store to query for `keys`. Required if no default store is set in `#bootstrap`.
  * `shouldRoute:bool` Set to `false` to disable serverside routing.


### voldemort#put(key, value, [options,] done)
Puts the values of `keys` into the default store or `options.store` if set.
Returns [Versioned](proto/voldemort-client.proto#L22) or `null` on error.

Options:
  * `version:VectorClock` Optional. If not set, fetches the current version
    of `key` before putting. If set, puts the version given, or errors if outdated.
  * `store:string` Required if no default store is set in `#bootstrap`.
  * `shouldRoute:bool` Set to `false` to disable serverside routing.


### voldemort#del(key, [options,] done)
Deletes `key` from the store.

Options:
  * `version:VectorClock` Optional. If not set, fetches the current version
    of `key` before deleting. If set, puts the version given, or errors if outdated.
  * `store:string` Required if no default store is set in `#bootstrap`.
  * `shouldRoute:bool` Set to `false` to disable serverside routing.


### voldemort#close(done)
Close the active connection with voldemort.

# License
MIT
