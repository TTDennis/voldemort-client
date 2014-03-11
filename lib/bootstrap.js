
/**
 * Dependencies
 */

var debug = require('debug')('voldemort:bootstrap');
var async = require('async');
var Node = require('./node');
var VoldemortConnection = require('./connection');

/**
 * Exports
 */

module.exports = exports = Bootstrap;

/**
 * Plugin
 */

function Bootstrap (Client) {

  /**
   * Hoist
   */

  Client.bootstrap = bootstrap;

  /**
   * Bootstrap client with `hosts`.
   *
   * @param {array} hosts
   * @param {object} options
   * @param {function} done
   */

  function bootstrap (hosts, options, done) {
    if (typeof options === 'function') {
      done = options;
      options = {};
    }
    var client = new Client(options);

    // Tasks that will connect to a cluster and parse its information.
    function tryHost(host, detect) {
      var tasks = [];
      tasks.push(function getConnection (done) {
        VoldemortConnection.connect({
          host    : host.host,
          port    : host.port,
          timeout : client.timeout
        }, done);
      });
      tasks.push(function getMetadata (socket, done) {
        debug('requesting metadata');
        client.connection = socket;
        client.get('cluster.xml', { store: 'metadata', raw: true }, done);
      });
      tasks.push(function getNodes (response, done) {
        debug('parsing cluster information');
        Node.fromXml(response.value.toBuffer(), done);
      });
      tasks.push(function onSuccess (nodes) {
        client.nodes  = nodes;
        if (client.randomize)
          client.nodeId = Math.floor(Math.random() * nodes.length);
        else {
          var i = findIndex(nodes, function (node) {
            return node.host === host.host && node.port === host.port;
          });
          client.nodeId = i !== -1 ? i : 0;
        }
        function findIndex (array, matcher) {
          for (var i = 0; i < array.length; i++) {
            if(matcher(array[i]))
              return i;
          }
          return -1;
        }
        detect(!!nodes.length);
      });

      async.waterfall(tasks, function(err) {
        if (err) detect(false);
      });
    }

    hosts = Array.isArray(hosts) ? hosts : [hosts];

    // Serialize and return on first successful connect.
    async.detectSeries(hosts, tryHost, function(success) {
      if (!success)
        return done(new Error('All bootstrap attempts failed'));
      debug('cluster initialized');
      function sameHost (node) {
        return node.host === client.connection.host && node.port === client.connection.port;
      }
      var node = client.nodes[client.nodeId];
      if (sameHost(node)) {
        debug('already connected to node #' + client.nodeId);
        done(null, client);
      } else {
        debug('connecting to node #%s', client.nodeId);
        client.close();
        VoldemortConnection.connect(node, function (err, connection) {
          if(err) return done(err);
          client.connection = connection;
          done(null, client);
        });
      }
    });
    return client;
  }
}
