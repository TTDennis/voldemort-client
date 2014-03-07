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
    return oldMax.timestamp < current.timestamp ? current : oldMax;
  }, 0);
}
exports.conflictResolver = conflictResolver;


function incrementVersion(vectorClock, nodeId) {
  var newClock = VectorClock.decode(vectorClock.encode());
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
  entry = new protocol.ClockEntry({
    node_id : nodeId,
    version: Long.fromInt(1)
  });
  newClock.timestamp = Long.fromInt(new Date().getTime());
  return newClock;
}
exports.incrementVersion = incrementVersion;

/*
        new_clock = protocol.VectorClock()
        new_clock.MergeFrom(clock)

        # See if we already have a version for this guy, if so increment it
        for entry in new_clock.entries:
            if entry.node_id == self.node_id:
                entry.version += 1
                return new_clock

        # Otherwise add a version
        entry = new_clock.entries.add()
        entry.node_id = self.node_id
        entry.version = 1
        new_clock.timestamp = int(time.time() * 1000)
*/
