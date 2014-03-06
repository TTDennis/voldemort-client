
var debug    = require('debug')('voldemort:connection');
var net      = require('net');
var Response = require('./protocol/response');

module.exports = function(Client) {


  /**
   * Create a new connection to <host>:<port> using <protocol>
   *
   * @option {string} host
   * @option {integer|string} port
   * @option {string} protocol
   * @param {object} options
   * @param {function} callback
   * @api private
   */
  function createConnection(options, done) {
    var hostString = options.host + ':' + options.port;

    var protocol = options.protocol || 'pb0';
    if(!(options.host || options.port)) {
      done(new Error('Cannot create connection, no hostname or port provided'));
    }

    debug('attempting to connect to ' + hostString);

    var socket = net.connect({
      host: options.host,
      port: options.port
    }, function() { //'connect' listener
      debug('Connection succeeded, negotiating protocol');
      socket.write(protocol);
    });

    socket.once('data', function onData(status) {
      socket.pause();

      status = status.toString();
      if(status === 'ok') {
        debug('Protocol negotiation succeeded');
        done(null, socket);
      } else {
        done(new Error('Server does not understand the protocol ' + protocol));
      }
    });

    socket.on('end', function() {
      debug('disconnected from ' + hostString);
    });

    // Cleanup on process exit
    process.once('exit', function() {
      socket.end();
    });
  }
  Client.createConnection = createConnection;


  /**
   * Close the client connection
   *
   * @param {socket} connection
   * @param {function} callback
   */
  function closeConnection(done) {
    done = done || function() {};
    if(!this.connection) {
      return done();
    }
    this.connection.end();
    done();
  }
  Client.prototype.close = closeConnection;


  /**
   * Convert a bytes field value into a node buffer
   *
   * @param {byteBuffer} value
   * @return {Buffer} Sanitized buffer
   * @api public
   */
  function bytesToBuf(value) {
    var val = value.array.slice(
      value.offset,
      value.length
    );

    var data = [];
    function isIntString(i) {
      return parseInt(i).toString() === i;
    }
    for(var k in val) {
      if(isIntString(k)) {
        data.push(val[k]);
      }
    }
    return new Buffer(data);
  }


  /**
   * Send a request over a given connection and wait for response
   *
   * @param {socket} connection
   * @param {Request} request
   * @param {function} callback
   * @api private
   */
  function sendRequest(connection, request, done) {
    // pack <size><request>
    var data = request.toBuffer();
    var size = new Buffer(4);
    size.writeInt32BE(data.length, 0);
    connection.write(Buffer.concat([size, data]));

    function read() {
      var sizeT = connection.read(4);
      if(sizeT === null) return;

      var size = sizeT.readInt32BE(0);
      debug('Got response of size '+ size + 'b');
      var response = Response.fromBuffer(request.options.type, connection.read(size));
      if(response.error && response.error.error_code !== 0) {
        return done(new Error(response.error.error_message));
      }
      // Sanitize reponse
      if(response.versioned) {
        response.versioned = response.versioned.map(function(version) {
          version.value = bytesToBuf(version.value);
          return version;
        });
      }

      done(null, response);
      connection.removeListener('error', onErr);
      connection.removeListener('readable', read);
    }
    function onErr(err) {
      debug(err);
      done(err);
      connection.removeListener('error', onErr);
      connection.removeListener('readable', read);
    }

    connection.on('readable', read);
    connection.on('error', onErr);
  }
  Client._sendRequest = sendRequest;


  /**
   * Send a request and wait for response
   *
   * @param {Request} request
   * @param {function} callback
   * @api public
   */
  Client.prototype.sendRequest = function(request, done) {
    this.requestCount++;
    Client._sendRequest(this.connection, request, done);
  };
};
