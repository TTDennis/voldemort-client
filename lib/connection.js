
var debug    = require('debug')('voldemort:connection');
var net      = require('net');
var Response = require('./protocol/response');
var QSocket = require('./socket');

module.exports = VoldemortConnection;


/**
 * A connection instance to <host>:<port> using <protocol>
 *
 * @param {object} options
 * @option {string} host
 * @option {integer|string} port
 * @option {string} protocol
 * @param {function} callback
 * @api private
 */
function VoldemortConnection(options, done) {
  if(!this instanceof VoldemortConnection) {
    return new VoldemortConnection(options, done);
  }
  this.host = options.host;
  this.port = options.port;
  this.requestCount = 0;
}


/**
 * Create a new connection to <host>:<port> using <protocol>
 *
 * @param {object} options
 * @option {string} host
 * @option {integer|string} port
 * @option {string} protocol
 * @param {function} callback
 * @api public
 */
VoldemortConnection.connect = function connect(options, done) {
  if(!(options.host || options.port)) {
    done(new Error('Cannot create connection, no hostname or port provided'));
  }
  var connection = new VoldemortConnection(options);
  debug('attempting to connect to ' + options.host + ':' + options.port);

  connection.socket = new QSocket(options.host, options.port);
  connection.socket.connect(function(err) {
    if(err) return done(err);
    connection.socket.send('pb0', function(err, res) {
      if(err) return done(err);

      if(res.toString() !== 'ok') {
        return done(new Error('Server does not understand the protocol pb0 (protobuf)'));
      }
      debug('Protocol negotiation succeeded');
      done(null, connection);
    });
  });
};


/**
 * Send a request and wait for response
 *
 * @param {Request} request
 * @param {function} callback
 * @api private
 */
VoldemortConnection.prototype.sendRequest = function(request, done) {
  var connection = this;
  this.requestCount++;

  var data = request.toBuffer();
  var size = new Buffer(4);
  size.writeInt32BE(data.length, 0);
  debug('Request: '+data.length+'b');
  connection.socket.send(Buffer.concat([size, data]), function(err, data) {
    if(err) return done(err);

    var size = data.readInt32BE(0);
    debug('Response: '+size+'b');
    if(!size) return done();

    data = data.slice(4);
    var response = Response.fromBuffer(request.options.type, data);
    if(response.error && response.error.error_code !== 0) {
      return done(new Error(response.error.error_message));
    }

    if(response.versioned) {
      response.versioned = response.versioned.map(function(version) {
        version.value = version.value.toBuffer();
        return version;
      });
    }

    done(null, response);
  });
};

VoldemortConnection.prototype.end = function() {
  this.socket.end();
};
