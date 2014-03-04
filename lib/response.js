var debug = require('debug')('voldemort:response');

var msgBuilder = require('./protobuf')('client');
var protocol = msgBuilder.build('voldemort');


function caps(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

exports.fromProto = function(type, proto) {
  try {
    return protocol[caps(type)+'Response'].decode(proto);
  } catch(e) {
    debug(e);
    return e.decoded;
  }
};