var parseXml = require('xml2js').parseString;

/**
 * Simple Node representation of voldemort server, containing
 *
 * @param options node options
 * @api public
 */
function Node(options) {
  if(!this instanceof Node) {
    return new Node(options);
  }
  options = options || {};
  for(var opt in options) {
    this[opt] = options[opt];
  }
}

/**
 * Utility function. Array.map for objects.
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


/**
 * Return a list of nodes for a cluster based on cluster.xml
 * @param {string} xml
 * @param {function} callback
 * @api public
 */
Node.fromXml = function(xml, done) {
  parseXml(xml, function(err, obj) {
    var servers = obj.cluster.server;
    var nodes = [];
    function first(n) { return n[0]; }
    for(var i in servers) {
      // Return first instance of each xml node (from lists):
      var server = mapObj(servers[i], first);

      var node = new Node({
        port: parseInt(server['socket-port'], 10),
        host: server.host,
        id:   server.id
      });
      nodes.push(node);
    }
    done(null, nodes);
  });
};

module.exports = Node;
