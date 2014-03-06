
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

    if(!(options.host || options.port)) {
      done(new Error('Cannot create connection, no hostname or port provided'));
    }

    debug('attempting to connect to ' + hostString);

    var socket = net.connect({
      host: options.host,
      port: options.port
    }, function() { //'connect' listener
      debug('Connection succeeded, negotiating protocol');
      socket.write('pb0');
    });

    socket.once('data', function onData(status) {
      socket.pause();

      status = status.toString();
      if(status === 'ok') {
        debug('Protocol negotiation succeeded');
        done(null, socket);
      } else {
        done(new Error('Server does not understand the protocol pb0 (protobuf)'));
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
      if(size === 0) return done();
      debug('Got response of size '+ size + 'b');
      var data = connection.read(size);
      if(!data) return done();
      var response = Response.fromBuffer(request.options.type, data);
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
      // Error handling How?
      // client.onError(err, done);

      connection.removeListener('error', onErr);
      connection.removeListener('readable', read);
    }

    connection.on('readable', read);
    // connection.on('error', onErr);
  }
  Client._sendRequest = sendRequest;


  /**
   * Connect to the next available node in the cluster
   * Callbacks with new connection on success
   *
   * @param {function} callback
   * @api private
   */
  Client.prototype.reconnect = function reconnect(done) {
    var client = this;
    debug('reconnecting');

    client.close();

    function onConnect(err, connection) {
      if(err) return done(err);

      client.connection = connection;
      done(null, client.connection);
    }

    // async
    // Serialize async and return on first successful connect:
    async.detectSeries(
      Array.apply(null, Array(this.nodes.length))
        .map(function(v,i) { return i+1; }),
      function(i, cb) {
        this.nodeId = (this.nodeId + i) % this.nodes.length;
        Client.createConnection(this.nodes[this.nodeId],
          function(err, connection) {
            if(err) return cb(false);
            client.connection = connection;
            cb(true);
          });
      },
      function(success) {
        if(success) {

        }
      }
    );
  };


  /**
   * Reconnect to a new node in cluster if the request count has exceeded
   * Callbacks with new connection or null, if no reconnect needed
   *
   * @param {function} callback
   * @api private
   */
  Client.prototype.maybeReconnect = function maybeReconnect(done) {
    if(this.requestCount % this.reconnectInterval === 0) {
      this.reconnect(done);
    } else {
      done();
    }
  };


  /**
   * Send a request and wait for response
   *
   * @param {Request} request
   * @param {function} callback
   * @api private
   */
  Client.prototype.sendRequest = function(request, done) {
    var client = this;
    this.requestCount++;
    this.maybeReconnect(function(err) {
      if(err) return done(err);
      Client._sendRequest(client.connection, request, done);
    });
  };
};
