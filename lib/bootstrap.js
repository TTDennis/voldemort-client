
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
  function bootstrap(bootstrapUrls, options, done) {
    if(typeof options === 'function') {
      done = options;
      options = {};
    }
    var client = new Client(options);

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
              port: host.port,
              timeout: client.timeout
            }, next);
          },
          function getMetadata(socket, next) {
            debug('requesting metadata');
            client.connection = socket;
            client.get('cluster.xml', {store: 'metadata', raw: true}, next);
          },
          function getNodes(response, next) {
            debug('Parsing cluster information');
            Node.fromXml(response.value.toBuffer(), next);// parseNodes
          },
          function onSuccess(nodes) {
            client.nodes  = nodes;
            function findIndex(arr, matcher) {
              for(var i = 0; i < arr.length; i++) {
                if(matcher(arr[i]))
                  return i;
              }
              return -1;
            }

            if(client.randomize) {
              client.nodeId = Math.floor(Math.random() * nodes.length);
            } else {
              var i = findIndex(nodes, function(n) {
                return n.host === host.host && n.port === host.port;
              });
              client.nodeId = i !== -1 ? i : 0;
            }

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
          VoldemortConnection.connect(node, function(err, connection) {
            if(err) return done(err);

            client.connection = connection;
            done(null, client);
          });
        }
      });
    return client;
  }
  Client.bootstrap = bootstrap;
};
