
/**
 * Dependencies
 */

var msgBuilder = require('./protobuf')('client');
var protocol = msgBuilder.build('voldemort');

/**
 * Capitalizes a string `str`.
 *
 * @api private
 */

function caps (string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * @todo @wejendorp
 */

exports.fromBuffer = function (type, buffer) {
  return protocol[caps(type)+'Response'].decode(buffer);
};
