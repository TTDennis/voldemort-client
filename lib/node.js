
/**
 * Dependencies
 */

var parse = require('xml2js').parseString;

/**
 * Exports
 */

module.exports = exports = Node;

/**
 * Simple Node representation of a Voldemort server.
 *
 * @param {object} options
 * @api public
 */

function Node (options) {
  if(!(this instanceof Node)) return new Node(options);
  options = options || {};
  for (var opt in options)
    this[opt] = options[opt];
}

/**
 * Return a list of nodes for a cluster based on cluster.xml.
 *
 * @param {string} xml
 * @param {function} done
 * @api public
 */

Node.fromXml = function (xml, done) {
  parse(xml, {explicitArray: false}, findNodes);
  function findNodes (err, data) {
    var servers = data.cluster.server;
    var nodes = [];
    for (var i in servers) {
      var server = servers[i];
      var node = new Node({
        port : parseInt(server['socket-port'], 10),
        host : server.host,
        id   : parseInt(server.id, 10)
      });

      nodes.push(node);
    }
    done(null, nodes);
  }
};
