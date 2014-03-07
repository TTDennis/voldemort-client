// var debug = require('debug')('voldemort:request');

var msgBuilder = require('./protobuf')('client');
var protocol = msgBuilder.build('voldemort');

/**
 * A simple instance of VoldemortRequest, as js object
 */
function Request(options) {
  if(!this instanceof Request) {
    return new Request(options);
  }

  this.options = options;
}


/**
 * Creates a new VoldemortRequest with RequestType GET for the given key
 *
 * @param {Object} key
 * @param {Object} options
 * @return {Request}
 */
Request.get = function createGetRequest(key, options) {
  options = {
    type: 'get',
    store: options.store,
    should_route: !!options.shouldRoute,
    get: new protocol.GetRequest({
      key: key
    })
  };

  return new Request(options);
};


/**
 * Creates a new VoldemortRequest with RequestType GET_ALL for the given key
 *
 * @param {Object} key
 * @param {Object} options
 * @return {Request}
 */
Request.getAll = function createGetAllRequest(keys, options) {
  options = {
    type: 'getAll',
    store: options.store,
    should_route: !!options.shouldRoute,
    getAll: new protocol.GetAllRequst({
      keys: keys
    })
  };
  return new Request(options);
};


/**
 * Creates a new VoldemortRequest with RequestType PUT for the given key
 *
 * @param {Object} key
 * @param {Object} options
 * @option {VectorClock} version [required]
 * @option {string} store
 * @option {bool} shouldRoute
 * @return {Request}
 */
Request.put = function createPutRequest(key, value, options) {
  options = {
    type: 'put',
    store: options.store,
    should_route: !!options.shouldRoute,
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


/**
 * Creates a new VoldemortRequest with RequestType DELETE for the given key
 *
 * @param {Object} key
 * @param {Object} options
 * @option {VectorClock} version [required]
 * @option {string} store
 * @option {bool} shouldRoute
 * @return {Request}
 */
Request.del = function createDeleteRequest(key, options) {
  options = {
    type: 'delete',
    store: options.store,
    should_route: !!options.shouldRoute,
    delete: new protocol.DeleteRequest({
      key: key,
      version: protocol.VectorClock.decode(options.version.encode())
    })
  };
  return new Request(options);
};

function toUnderscored(str){
  return str.replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toUpperCase();
}


/**
 * Serialize this Request into a node buffer
 *
 * @return {Buffer}
 */
Request.prototype.toBuffer = function() {
  function clone(obj) {
    var o = {};
    for(var k in obj) {
      o[k] = obj[k];
    }
    return o;
  }

  var obj = clone(this.options);
  var enumKey = toUnderscored(obj.type);
  obj.type = protocol.RequestType[enumKey];

  return (new protocol.VoldemortRequest(obj)).encode().toBuffer();
};


/**
 * Creates a new VoldemortRequest from a buffer
 *
 * @param {Buffer} buffer
 * @return {VoldemortRequest}
 */
Request.fromBuffer = function(buffer) {
  return protocol.VoldemortRequest.decode(buffer);
};

module.exports = Request;
