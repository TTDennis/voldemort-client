var protobuf = require('protobufjs');
var fs = require('fs');

module.exports = function(schema) {
  return protobuf.loadProto(fs.readFileSync(__dirname+'/../proto/voldemort-'+schema+'.proto'));
};