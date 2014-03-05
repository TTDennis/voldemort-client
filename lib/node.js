var debug = require('debug')('voldemort:node');
// For each host:
// * connection
// * command count
//

var parseXml = require('xml2js').parseString;

/**
 * Simple Node representation of voldemort server
 *
 */
function Node(options) {
  if(!this instanceof Node) {
    return new Node(options);
  }
  options = options || {};

  this.options = options;
}

Node.fromXml = function(xml) {
  parseXml(xml, function(err, obj) {
    console.dir(obj);
  });
};

module.exports = Node;