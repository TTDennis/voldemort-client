var parseXml = require('xml2js').parseString;

/**
 * Simple Node representation of voldemort server, containing
 *
 * @param options node options
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

function mapObj(obj, fn) {
  for(var k in obj) {
    obj[k] = fn(obj[k]);
  }
  return obj;
}


/**
 * Return a list of nodes for a cluster based on cluster.xml
 * @param {string} xml
 * @param {function} callback
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
        port: server['socket-port'],
        host: server.host,
        id:   server.id
      });
      nodes.push(node);
    }
    done(null, nodes);
  });
};

module.exports = Node;
