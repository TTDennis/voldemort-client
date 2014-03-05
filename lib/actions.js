var debug = require('debug')('voldemort:client');

var Request = require('./protocol/request');
var async   = require('async');

module.exports = function(Client) {
  Client.get = function getKey(socket, store, key, done) {
    var request = Request.get(key, {store: store});
    Client.sendRequest(socket, request, done);
  };
  Client.prototype.get = function(key, done) {
    Client.get(this.connection, this.store, key, done);
  };

  Client.put = function putKey(socket, store, key, value, version, done) {
    var request = Request.put(key, value);
    Client.sendRequest(socket, request, done);
  }
  Client.prototype.put = function(key, value, version, done) {
    Client.put(this.connection, this.store, key, value, version, done);
  };

  function deleteKey(socket, store, key, version, done) {
    var request = Request.del(key, version);
    Client.sendRequest(socket, request, done);
  }
  Client.prototype.del = function(key, version, done) {
    Client.del(this.connection, this.store, key, version, done);
  };
};