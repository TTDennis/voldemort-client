var Request = require('./protocol/request');

module.exports = function(Client) {
  Client.prototype.get = function(store, key, done) {
    var request = Request.get(key, {store: store});
    this.sendRequest(request, done);
  };

  Client.prototype.put = function(store, key, value, version, done) {
    var request = Request.put(key, value, {store: store});
    this.sendRequest(request, done);
  };

  Client.prototype.del = function(store, key, version, done) {
    var request = Request.del(key, version, {store: store});
    this.sendRequest(request, done);
  };
};
