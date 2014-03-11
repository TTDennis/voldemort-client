
/**
 * Dependencies
 */

var protobuf = require('protobufjs');
var fs = require('fs');

/**
 * Exports
 */

module.exports = exports = loadProtoSchema;

/**
 * Reads a proto schema file `schema` and returns its protobuf object.
 *
 * @param {string} schema
 * @return {object}
 */

function loadProtoSchema (schema) {
  var data = fs.readFileSync(__dirname + '/../../proto/voldemort-' + schema + '.proto');
  return protobuf.loadProto(data);
}
