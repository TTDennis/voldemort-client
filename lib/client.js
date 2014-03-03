var debug = require('debug')('voldemort:client');

var net = require('net');

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
  var host;
  for(var i in this.bootstrapUrls) {
    host = this.bootstrapUrls[i];

    done();
  }
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

  var client = net.connect({
    host: options.host,
    port: options.port
  }, function() { //'connect' listener
    debug('Connection succeeded, negotiating protocol');
    client.write(protocol);
  });
  client.on('readable', function() {
    var status = client.read(2);
    if(status === null) return;

    status = status.toString();
    if(status === 'ok') {
      debug('Protocol negotiation succeeded');
      self.connection = client;

      done(null, client);
    } else {
      done(new Error('Server does not understand the protocol ' + protocol));
    }
  });

  client.on('end', function() {
    debug('disconnected from' + host);
  });

  // Cleanup on process exit
  process.once('exit', function() {
    client.end();
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



function getWithConnection(connection, storeName, key, should_route, done) {
  if(typeof should_route === 'function') {
    done = should_route;
    should_route = null;
  }
  // Proto request:


}



function getKey(key, done) {

}
Client.prototype.get = getKey;

function putKey(key, value, version, done) {

}
Client.prototype.put = putKey;

function deleteKey(key, version, done) {

}