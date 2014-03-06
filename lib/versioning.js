// VectorClock increment and resolve

/**
 * Sample conflictResolver, always returns the version with the newest timestamp
 * @param {[voldemort.Versioned]} List of {Versioned} to resolve
 */
function conflictResolver(versions) {
  return versions.reduce(function(oldMax, current) {
    return oldMax.timestamp < current.timestamp ? current : oldMax;
  }, 0);
}

module.exports = {
  conflictResolver: conflictResolver
};
