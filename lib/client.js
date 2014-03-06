var debug = require('debug')('voldemort:client');
var async = require('async');
var Node = require('./node');


/**
 * Create a new client for <storeName>, using the cluster returned from <bootstrapUrls>.
 *
 * @option {string} storeName
 * @option {list} bootstrapUrls
 * @option {integer} optional reconnectInterval
 * @param {function} conflictResolver
 */
function Client(storeName, reconnectInterval, conflictResolver) {
  if(!this instanceof Client) {
    return new Client(storeName, reconnectInterval, conflictResolver);
  }
  this.reconnectInterval = reconnectInterval || 500;
  this.storeName = storeName;
  this.requestCount = 0;
  this.conflictResolver = conflictResolver;
  this.store = ''; // storeName in bootstrap data?
}


/**
 * Connect to the next available node in the cluster
 * Callbacks with new connection on success
 *
 * @param {function} callback
 */
Client.prototype.reconnect = function reconnect(done) {
  var client = this;
  this.nodeId = (this.nodeId + 1) % this.nodes.length;
  Client.createConnection(this.nodes[this.nodeId], function(err, connection) {
    if(err) return done(err);

    client.connection = connection;
    done(null, client.connection);
  });
};


/**
 * Reconnect to a new node in cluster if the request count has exceeded
 * Callbacks with new connection or null, if no reconnect needed
 *
 * @param {function} callback
 */
Client.prototype.maybeReconnect = function maybeReconnect(done) {
  if(this.requestCount % this.reconnectInterval === 0) {
    this.reconnect(done);
  } else {
    done();
  }
};



/**
 * Bootstrap client with the cluster(s) {bootstrapUrls}
 *
 * @param {[ {hostName, port} ]} List of hosts: {hostName: .., port: ..}
 * @param {function} callback
 */
function bootstrap(bootstrapUrls, done) {
  var client = this;
  bootstrapUrls = Array.isArray(bootstrapUrls) ? bootstrapUrls : [bootstrapUrls];
  // Serialize async and return on first successful connect:
  async.detectSeries(
    bootstrapUrls,
    function(host, detectCb) {
      // Connect to host, get metadata and initialize client with nodes
      async.waterfall([
        function getConnection(next) {
          Client.createConnection({
            host: host.hostName,
            port: host.port
          }, next);
        },
        function getMetadata(socket, next) {
          debug('requesting metadata');
          client.connection = socket;
          client.get('metadata', 'cluster.xml', next);
        },
        function getNodes(response, next) {
          debug('Parsing cluster information');
          Node.fromXml(response.versioned[0].value, next);// parseNodes
        },
        function onSuccess(nodes) {
          debug('Cluster initialized');
          client.nodes  = nodes;
          client.nodeId = Math.floor(Math.random() * nodes.length);

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
 * Plugin function for Client. Extend client by running plugin.
 *
 * @param {function} plugin(Client)
 */
Client.use = function use(plugin) {
  plugin(Client);
  return Client;
};

Client.use(require('./connection'));
Client.use(require('./actions'));

module.exports = Client;
