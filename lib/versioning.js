
/**
 * Dependencies
 */

var debug = require('debug')('voldemort:versioning');
var msgBuilder = require('./protocol/protobuf')('client');
var protocol = msgBuilder.build('voldemort');
var VectorClock = protocol.VectorClock;

/**
 * Exports
 */

exports.conflictResolver = conflictResolver;
exports.incrementVersion = incrementVersion;
exports.VectorClock = VectorClock;
exports.Versioned = protocol.Versioned;
module.exports = exports;

// @todo @wejendorp
exports.toVersioned = function(value, version) {
  return new protocol.Versioned({
    value: value,
    version: version
  });
};

/**
 * Sample conflictResolver, always returns the version with the newest timestamp.
 *
 * @param {array} versions
 */

function conflictResolver (versions) {
  return versions.reduce(function (oldMax, current) {
    return oldMax.version.timestamp <= current.version.timestamp ? current : oldMax;
  }, versions[0]);
}

/**
 * @todo @wejendorp
 */

function incrementVersion (vectorClock, nodeId) {
  var newClock = new VectorClock({ entries: [] });
  if (vectorClock) newClock = VectorClock.decode(vectorClock.encode());
  var entry;
  for (var key in newClock.entries) {
    entry = newClock.entries[key];
    if (entry.node_id === nodeId) {
      debug('incrementing version for node #%s', nodeId);
      entry.setVersion(entry.version.add(1));
      return newClock;
    }
  }
  debug('adding new version for node #%s', nodeId);
  newClock.entries.push(
    new protocol.ClockEntry({
      node_id : nodeId,
      version : 1
    })
  );
  newClock.timestamp = new Date().getTime();
  return newClock;
}
