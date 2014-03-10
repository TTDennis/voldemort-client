// VectorClock increment and resolve
var debug = require('debug')('voldemort:versioning');
var Long = require('long'); // int64
var msgBuilder = require('./protocol/protobuf')('client');
var protocol = msgBuilder.build('voldemort');
var VectorClock = protocol.VectorClock;

/**
 * Sample conflictResolver, always returns the version with the newest timestamp
 * @param {[voldemort.Versioned]} List of {Versioned} to resolve
 */
function conflictResolver(versions) {
  return versions.reduce(function(oldMax, current) {
    return oldMax.timestamp <= current.timestamp ? current : oldMax;
  }, versions[0]);
}
exports.conflictResolver = conflictResolver;


function incrementVersion(vectorClock, nodeId) {
  var newClock = new VectorClock({
    entries: []
  });
  if(vectorClock) newClock = VectorClock.decode(vectorClock.encode());

  var entry;
  // try increment this node version
  for(var k in newClock.entries) {
    entry = newClock.entries[k];
    if(entry.node_id === nodeId) {
      debug('incrementing version for node #'+nodeId);
      entry.setVersion(entry.version.add(Long.fromInt(1)));
      return newClock;
    }
  }
  debug('adding new version for node #'+nodeId);
  // or add a new entry
  newClock.entries.push(
    new protocol.ClockEntry({
      node_id : nodeId,
      version: Long.fromInt(1)
    })
  );
  newClock.timestamp = Long.fromInt(new Date().getTime());
  return newClock;
}
exports.incrementVersion = incrementVersion;


exports.VectorClock = VectorClock;
exports.Versioned = protocol.Versioned;

exports.toVersioned = function(value, version) {
  return new protocol.Versioned({
    value: value,
    version: version
  });
};
