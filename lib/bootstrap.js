
var debug = require('debug')('voldemort:bootstrap');
var async = require('async');
var Node = require('./node');
var VoldemortConnection = require('./connection');

module.exports = function(Client) {


  /**
   * Bootstrap client with the cluster(s) {bootstrapUrls}
   *
   * @param {[ {host, port} ]} List of hosts: {host: .., port: ..}
   * @param {function} callback
   */
  function bootstrap(bootstrapUrls, done) {
    var client = this;
    if(!this instanceof Client) {
      client = new Client();
    }

    bootstrapUrls = Array.isArray(bootstrapUrls) ? bootstrapUrls : [bootstrapUrls];
    // Serialize async and return on first successful connect:
    async.detectSeries(
      bootstrapUrls,
      function(host, detectCb) {
        // Connect to host, get metadata and initialize client with nodes
        async.waterfall([
          function getConnection(next) {
            VoldemortConnection.connect({
              host: host.host,
              port: host.port
            }, next);
          },
          function getMetadata(socket, next) {
            debug('requesting metadata');
            client.connection = socket;
            client.get('cluster.xml', {store: 'metadata'}, next);
          },
          function getNodes(response, next) {
            debug('Parsing cluster information');
            Node.fromXml(response.value, next);// parseNodes
          },
          function onSuccess(nodes) {
            client.nodes  = nodes;
            client.nodeId = Math.floor(Math.random() * nodes.length);

            detectCb(!!nodes.length);
          }
        ], function(err) {
          if(err) detectCb(false);
        });
      }, function(success) {
        if(!success) {
          return done(new Error('All bootstrap attempts failed'));
        }
        debug('Cluster initialized');
        function sameHost(node) {
          return node.host === client.connection.host && node.port === client.connection.port;
        }
        var node = client.nodes[client.nodeId];
        if(sameHost(node)) {
          debug('Already connected to node #'+client.nodeId);
          done(null, client);
        } else {
          debug('Connecting to node #'+client.nodeId);
          client.close();
          Client.createConnection(node, function(err, connection) {
            if(err) return done(err);

            client.connection = connection;
            done(null, client);
          });
        }
      });
  }
  Client.prototype.bootstrap = Client.prototype.init = bootstrap;
};
