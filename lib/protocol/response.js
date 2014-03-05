var debug = require('debug')('voldemort:response');

var msgBuilder = require('./protobuf')('client');
var protocol = msgBuilder.build('voldemort');

function caps(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

exports.fromBuffer = function(type, buffer) {
  return protocol[caps(type)+'Response'].decode(buffer);
};