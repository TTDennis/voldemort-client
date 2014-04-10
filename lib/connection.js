
/**
 * Dependencies
 */

var debug    = require('debug')('voldemort:connection');
var net      = require('net');
var Response = require('./protocol/response');
var QSocket  = require('./socket');

/**
 * Exports
 */

module.exports = exports = VoldemortConnection;

/**
 * A connection instance to `options.host`:`options.port` using `options.protocol`.
 *
 * @param {object} options
 * @param {function} done
 * @api private
 */

function VoldemortConnection (options, done) {
  if (!(this instanceof VoldemortConnection))
    return new VoldemortConnection(options, done);
  this.host = options.host;
  this.port = options.port;
  this.requestCount = 0;
}

/**
 * Create a new connection to `options.host`:`options.port` using `options.protocol`.
 *
 * @param {object} options
 * @param {function} done
 * @api public
 */

VoldemortConnection.connect = function connect(options, done) {
  if (!(options.host || options.port))
    return done(new Error('Cannot create connection, no hostname or port provided'));
  var connection = new VoldemortConnection(options);
  debug('attempting to connect to ' + options.host + ':' + options.port);
  connection.socket = QSocket(options.host, options.port);
  connection.socket.connect(options, function (err) {
    if (err) return done(err);
    connection.socket.send('pb0', function (err, res) {
      if (err) return done(err);
      if (res.toString() !== 'ok')
        return done(new Error('Server does not understand the protocol pb0 (protobuf)'));
      debug('protocol negotiation succeeded');
      done(null, connection);
    });
  });
};

/**
 * Send a request and wait for response.
 *
 * @param {Request} request
 * @param {function} callback
 * @api private
 */

VoldemortConnection.prototype.sendRequest = function (request, done) {
  var connection = this;
  this.requestCount++;
  var data = request.toBuffer();
  var size = new Buffer(4);
  size.writeInt32BE(data.length, 0);
  debug('request: ' + data.length + 'b');
  connection.socket.send(Buffer.concat([size, data]), function (err, data) {
    if (err) return done(err);
    if (!size) return done();
    var response = Response.fromBuffer(request.options.type, data);
    if (response.error && response.error.error_code !== 0)
      return done(new Error(response.error.error_message));
    done(null, response);
  });
};

/**
 * Wraps the socket function and sets its timeout value to `timeout`.
 *
 * @param {number} timeout
 */

VoldemortConnection.prototype.setTimeout = function (timeout) {
  this.socket.setTimeout(timeout);
};

/**
 * Wraps the socket function and ends it.
 */

VoldemortConnection.prototype.end = function () {
  this.socket.end();
};

VoldemortConnection.prototype.alive = function() {
  return this.socket.alive;
};
