

function TimeoutError(message) {
  this.name = "TimeoutError";
  this.message = message || "Request timed out";
}
TimeoutError.prototype = new Error();
TimeoutError.prototype.constructor = TimeoutError;


exports.Timeout = TimeoutError;
