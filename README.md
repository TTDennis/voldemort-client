# Node-voldemort (WIP)
[Voldemort](http://github.com/voldemort/voldemort) is the open source fork of Amazon DynamoDB, which
is a distributed key-value store.

This project aims to provide a NodeJS driver for Voldemort, to allow you to roll your own
instances without AWS.

We recommend using the socket based implementation where possible, for performance reasons, although
both HTTP and bare TCP/IP are supported.

# Installation
```
npm install node-voldemort
```

# Documentation
The client is based on [the official client spec](https://github.com/voldemort/voldemort/wiki/Writing-own-client-for-Voldemort).


