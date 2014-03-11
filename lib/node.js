
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
  parse(xml, findNodes);
  function findNodes (err, data) {
    var servers = data.cluster.server;
    var nodes = [];
    for (var i in servers) {
      var server = servers.shift();
      var node = new Node({
        port : parseInt(server['socket-port'], 10),
        host : server.host,
        id   : server.id
      });
      nodes.push(node);
    }
    done(null, nodes);
  }
};

/**
 * Utility map for objects.
 *
 * @param {object} object
 * @param {function} transform
 * @api private
 */

function mapObj(object, transform) {
  for(var k in object) {
    object[k] = transform(object[k]);
  }
  return object;
}
