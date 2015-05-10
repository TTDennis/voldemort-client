
/**
 * Dependencies
 */

var debug = require('debug')('voldemort:request');
var msgBuilder = require('./protobuf')('client');
var protocol = msgBuilder.build('voldemort');
var util = require('util');

/**
 * Exports
 */

module.exports = Request;

/**
 * A Voldemort request.
 *
 * @param {object} options
 */

function Request (options) {
  if (!(this instanceof Request))
    return new Request(options);

  this.options = options;
}

/**
 * Returns a new get `Request`.
 *
 * @param {object} key
 * @param {object} options
 * @return {object}
 */

Request.get = function createGetRequest (key, options) {
  options = {
    type         : 'get',
    store        : options.store,
    should_route : !!options.shouldRoute,
    get          : new protocol.GetRequest({ key: key })
  };
  return new Request(options);
};


/**
 * Creates a new getAll `Request`.
 *
 * @param {object} key
 * @param {object} options
 * @return {object}
 */

Request.getAll = function createGetAllRequest (keys, options) {
  options = {
    type         : 'getAll',
    store        : options.store,
    should_route : !!options.shouldRoute,
    getAll       : new protocol.GetAllRequest({ keys: keys })
  };
  return new Request(options);
};

/**
 * Creates a new put `Request`.
 *
 * @param {Object} key
 * @param {object} value
 * @param {Object} options
 * @return {object}
 */

Request.put = function createPutRequest (key, value, options) {
  var putRequest = new protocol.PutRequest({
    key       : key,
    versioned : new protocol.Versioned({
      value   : value,
      version : protocol.VectorClock.decode(options.version.encode())
    })
  });
  options = {
    type         : 'put',
    store        : options.store,
    should_route : !!options.shouldRoute,
    put          : putRequest
  };
  return new Request(options);
};


/**
 * Creates a new delete `Request`.
 *
 * @param {object} key
 * @param {object} options
 * @return {object}
 */

Request.del = function createDeleteRequest (key, options) {
  var deleteRequest = new protocol.DeleteRequest({
    key     : key,
    version : protocol.VectorClock.decode(options.version.encode())
  });
  options = {
    type         : 'delete',
    store        : options.store,
    should_route : !!options.shouldRoute,
    delete       : deleteRequest
  };
  return new Request(options);
};

/**
 * Converts a string `str` to underscore instead of dashes.
 */

function toUnderscored (str){
  return str.replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toUpperCase();
}

/**
 * Serialize a `Request` into a node `Buffer`.
 *
 * @return {Buffer}
 */

Request.prototype.toBuffer = function() {
  var data = util._extend({}, this.options);
  var enumKey = toUnderscored(data.type);
  data.type = protocol.RequestType[enumKey];
  return (new protocol.VoldemortRequest(data)).encode().toBuffer();
};

/**
 * Creates a new `Request` from a `Buffer`.
 *
 * @param {Buffer} buffer
 * @return {Request}
 */

Request.fromBuffer = function (buffer) {
  return protocol.VoldemortRequest.decode(buffer);
};
