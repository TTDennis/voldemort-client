
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
    var self = this;

    var protocol = options.protocol || 'pb0';
    if(!(options.host || options.port)) {
      done(new Error('Cannot create connection, no hostname or port provided'));
    }

    debug('attempting to connect to ' + options.host + ':' + options.port);

    var socket = net.connect({
      host: options.host,
      port: options.port
    }, function() { //'connect' listener
      debug('Connection succeeded, negotiating protocol');
      socket.write(protocol);
    });

    socket.pause();
    socket.on('data', function onData(status) {
      socket.pause();

      status = status.toString();
      if(status === 'ok') {
        debug('Protocol negotiation succeeded');
        done(null, socket);
      } else {
        done(new Error('Server does not understand the protocol ' + protocol));
      }
      socket.removeListener('data', onData);
    });
    socket.resume();

    socket.on('end', function() {
      debug('disconnected from' + options.host);
    });

    // Cleanup on process exit
    process.once('exit', function() {
      socket.end();
      debug('Connection to ' + options.host+ ':'+ options.port + ' closed');
    });
  }
  Client.createConnection = createConnection;

  /**
   * Connect to the next available node in the cluster
   * Callbacks with new connection on success
   *
   * @param {function} callback
   */
  function reconnect(done) {
    var i = this.nodeId;

  }
  Client.prototype.reconnect = reconnect;


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
    debug('Connection closed');
    done();
  }
  Client.prototype.close = closeConnection;


  /**
   * Send a request over a given connection and wait for response
   *
   * @param {socket} connection
   * @param {Request} request
   * @param {function} callback
   */
  function sendRequest(connection, request, done) {
    connection.pause();
    connection.write(request.toBuffer());

    function read() {
      var sizeT = connection.read(4);
      if(sizeT === null) return;

      var size = sizeT.readInt32BE(0);
      debug('Got response of size '+ size + 'b');
      var response = Response.fromBuffer(request.options.type, connection.read(size));
      if(response.error && response.error.error_code !== 0) {
        return done(new Error(response.error.error_message));
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
  };
  Client.sendRequest = sendRequest;
  Client.prototype.sendRequest = function(request, done) {
    Client.sendRequest(this.connection, request, done);
  };
};