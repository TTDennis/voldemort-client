var debug = require('debug')('voldemort:client');

var net   = require('net');
var async = require('async');

var Request = require('./request');

module.exports = Client;
/**
 * Create a new client for <storeName>, using the cluster returned from <bootstrapUrls>.
 *
 * @option {string} storeName
 * @option {list} bootstrapUrls
 * @option {integer} optional reconnectInterval
 * @param {function} conflictResolver
 */
function Client(storeName, bootstrapUrls, reconnectInterval, conflictResolver) {
  if(!this instanceof Client) {
    return new Client(storeName, bootstrapUrls, reconnectInterval, conflictResolver);
  }
  this.storeName = storeName;
  this.requestCount = 0;
  this.conflictResolver = conflictResolver;
  this.bootstrapUrls = bootstrapUrls;

  this.nodes = ''; // get from a bootstrapUrl
  this.store = ''; // storeName in bootstrap data?

  this.nodeId = Math.floor(Math.random() * this.nodes.length); // random node in set
}


function bootstrap(done) {
  var host, client = this;
  async.detectSeries(
    this.bootstrapUrls,
    function(host, next) {
      async.waterfall([
        function(next) {
          createConnection({
            host: host.hostName,
            port: host.port
          }, next);
        },
        function(socket, next) {
          client.getWithConnection(socket, 'metadata', 'cluster.xml', next);
        },
        function(xml) {
          console.log(xml);
        }
      ], function(err) {
        if(!err) next(true);
      });
  }, function(success) {
    if(!success) done(new Error('All bootstrap attempts failed'));
    done();
  });
}
Client.prototype.bootstrap = Client.prototype.init = bootstrap;


/**
 * Create a new connection to <host>:<port> using <protocol>
 *
 * @option {string} host
 * @option {integer|string} port
 * @option {string} protocol
 * @param {object} options
 * @param {function} callback
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
  socket.on('data', function(status) {
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
    debug('disconnected from' + options.host);
  });

  // Cleanup on process exit
  process.once('exit', function() {
    socket.end();
    debug('Connection to ' + options.host+ ':'+ options.port + ' closed');
  });
}
Client.prototype.createConnection = createConnection;

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



function sendRequest(connection, request, done) {
  connection.write(request.toBuffer());
  connection.on('data', function(resp) {
    connection.pause();
    done(null, resp);
  });
};

Client.prototype.sendRequest = sendRequest;


function getWithConnection(connection, storeName, key, shouldRoute, done) {
  if(typeof shouldRoute === 'function') {
    done = shouldRoute;
    shouldRoute = false;
  }
  // Proto request:
  var payload = Request.get(key, {
    should_route: shouldRoute,
    store:        storeName
  });

  // TODO check errors
  this.sendRequest(connection, payload, done);
}
Client.prototype.getWithConnection = getWithConnection;

function getKey(key, done) {

}
Client.prototype.get = getKey;

function putKey(key, value, version, done) {

}
Client.prototype.put = putKey;

function deleteKey(key, version, done) {

}