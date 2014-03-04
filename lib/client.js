var debug = require('debug')('voldemort:client');

var net   = require('net');
var async = require('async');

var Request  = require('./request');
var Response = require('./response');

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

Client.use = function use(plugin) {
  plugin(Client);
  return Client;
};

function bootstrap(done) {
  var host, client = this;
  async.detectSeries(
    this.bootstrapUrls,
    function(host, detectCb) {
      async.waterfall([
        function(next) {
          Client.createConnection({
            host: host.hostName,
            port: host.port
          }, next);
        },
        function(socket, next) {
          debug('requesting metadata');
          Client.getWithConnection(socket, 'metadata', 'cluster.xml', next);
        },
        function(xml) {
          // parseNodes
          client.parseNodes(xml);
          detectCb(true);
        }
      ], function(err) {
        if(err) detectCb(false);
      });

  }, function(success) {
    if(!success) {
      return done(new Error('All bootstrap attempts failed'));
    }
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



function sendRequest(connection, request, done) {
  connection.write(request.toBuffer());
  debug(request.toBuffer().toString());
  connection.pause();
  connection.on('data', function onData(resp) {
    connection.pause();
    done(null, resp);
    connection.removeListener('data', onData);
  });
  connection.resume();
  connection.on('error', function(err) {
    debug(err);
    done(err);
  });
};

Client.sendRequest = sendRequest;


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
  Client.sendRequest(connection, payload, done);
}
Client.getWithConnection = getWithConnection;



Client.prototype.parseNodes = function(response) {
  var parsed = Response.fromProto('getAll', response);
  console.log(parsed);
  // this.nodes   = '';
  // this.node_id = '';
};


function getKey(key, done) {

}
Client.prototype.get = getKey;

function putKey(key, value, version, done) {

}
Client.prototype.put = putKey;

function deleteKey(key, version, done) {

}