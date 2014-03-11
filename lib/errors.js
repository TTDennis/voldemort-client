
/**
 * Exports
 */

exports.Timeout = TimeoutError;
module.exports = exports;

/**
 * A custom error for Timeouts.
 *
 * @param {string} message
 */

function TimeoutError (message) {
  this.name = 'TimeoutError';
  this.message = message || 'Request timed out';
}

TimeoutError.prototype = new Error();
TimeoutError.prototype.constructor = TimeoutError;
