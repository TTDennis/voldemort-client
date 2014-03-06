// var debug = require('debug')('voldemort:request');

var msgBuilder = require('./protobuf')('client');
var protocol = msgBuilder.build('voldemort');

function toUnderscored(str){
  return str.replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
}
function clone(obj) {
  if (null === obj || 'object' !== typeof obj) return obj;
  var copy = obj.constructor();
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
  }
  return copy;
}

function Request(options) {
  if(!this instanceof Request) {
    return new Request(options);
  }
  this.options = options;
}

Request.get = function createGetRequest(key, options) {
  options = options || {};

  options.type = 'get';
  options.get  = new protocol.GetRequest({
    key: key,
    // transforms
  });
  return new Request(options);
};
Request.getAll = function createGetAllRequest(keys, options) {
  options = options || {};

  options.type = 'getAll';
  options.getAll = new protocol.GetAllRequst({
    keys: keys,
    // transforms
  });
  return new Request(options);
};
Request.put = function createPutRequest(key, value, options) {
  options = options || {};

  options.type = 'put';
  options.put = new protocol.PutRequest({
    key: key,
    versioned: new protocol.Versioned({
      value: value,
      version: new protocol.VectorClock({}) // TODO: Vectorclock
    })
  });
  return new Request(options);
};
Request.del = function createDeleteRequest(key, version, options) {
  options = options || {};

  options.type = 'delete';
  options.delete = new protocol.DeleteRequest({
    key: key,
    version: new protocol.VectorClock({version: version})
  });
  return new Request(options);
};

Request.prototype.toBuffer = function() {
  var obj = clone(this.options);
  var enumKey = toUnderscored(obj.type).toUpperCase();
  obj.type = protocol.RequestType[enumKey];
  return new protocol.VoldemortRequest(obj).encode().toBuffer();
};
Request.fromBuffer = function(buffer) {
  return protocol.VoldemortRequest.decode(buffer);
};

module.exports = Request;
