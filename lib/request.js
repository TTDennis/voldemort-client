var debug = require('debug')('voldemort:request');


// Create a request with a given version

//https://github.com/voldemort/voldemort/wiki/Writing-own-client-for-Voldemort#wiki-handling-versions
// Vector clock

var msgBuilder = require('./protobuf')('client');
var protocol = msgBuilder.build('voldemort');


function Request(options) {
  // if(!this instanceof Request) {
  //   return new Request(options);
  // }
  this.options = options;
};
Request.get = function createGetRequest(key, options) {
  options.type = protocol.RequestType.GET;
  options.get  = new protocol.GetRequest({
    key: key
    // transforms?
  });
  return new Request(options);
};
Request.getAll = function createGetAllRequest(keys, options) {
  options.type = protocol.RequestType.GET_ALL;
  // options.getAll =
};
Request.put = function createPutRequest(options) {

};
Request.del = function createDeleteRequest(options) {

};

Request.prototype.serialize = function() {
  return new protocol.VoldemortRequest(this.options).encode();
};
Request.prototype.toBuffer = function() {
  var data = this.serialize();
  var size = new Buffer(4);
  size.writeUInt32BE(data.length, 0);
  return Buffer.concat([size, data]);
};

module.exports = Request;