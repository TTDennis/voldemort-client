// var debug = require('debug')('voldemort:request');

var msgBuilder = require('./protobuf')('client');
var protocol = msgBuilder.build('voldemort');

function clone(obj) {
  if (!obj || 'object' !== typeof obj) return obj;
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
  options = {
    type: 'get',
    store: options.store,
    get: new protocol.GetRequest({
      key: key
    })
  };

  return new Request(options);
};
Request.getAll = function createGetAllRequest(keys, options) {
  options = {
    type: 'getAll',
    store: options.store,
    getAll: new protocol.GetAllRequst({
      keys: keys
    })
  };
  return new Request(options);
};

Request.put = function createPutRequest(key, value, options) {
  options = {
    type: 'put',
    store: options.store,
    put: new protocol.PutRequest({
      key: key,
      versioned: new protocol.Versioned({
        value:   value,
        version: protocol.VectorClock.decode(options.version.encode()) //strange hack
      })
    })
  };
  return new Request(options);
};
Request.del = function createDeleteRequest(key, options) {
  options = {
    type: 'delete',
    store: options.store,
    delete: new protocol.DeleteRequest({
      key: key,
      version: protocol.VectorCloc.decode(options.version.encode())
    })
  };
  return new Request(options);
};

function toUnderscored(str){
  return str.replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toUpperCase();
}

Request.prototype.toBuffer = function() {
  var obj = clone(this.options);
  var enumKey = toUnderscored(obj.type);
  obj.type = protocol.RequestType[enumKey];

  return (new protocol.VoldemortRequest(obj)).encode().toBuffer();
};
Request.fromBuffer = function(buffer) {
  return protocol.VoldemortRequest.decode(buffer);
};

module.exports = Request;
