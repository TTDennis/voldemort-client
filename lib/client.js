
var defaultResolver = require('./versioning').conflictResolver;

/**
 * Create a new client for <storeName>.
 * Client must be initialized against a bootstrapUrl using client#bootstrap
 *
 * @param {string} default storeName
 * @param {integer} optional reconnectInterval
 * @param {function} optional conflictResolver
 * @param {function} optional errorHandler
 */
function Client(options) {
  if(!this instanceof Client) {
    return new Client(options);
  }
  options = options || {};

  this.conflictResolver = options.conflictResolver || defaultResolver;

  this.valueSerializer = options.valueSerializer || {
    deserialize: function(v) {
      return v.toBuffer();
    },
    serialize: function(v) {
      return new Buffer(v);
    }
  };

  this.keySerializer = options.keySerializer || {
    deserialize: function(k) {
      return k.toBuffer().toString();
    },
    serialize: function(k) {
      return k;
    }
  };

    // Bootstrap related
  this.nodeId = 0;
  this.nodes = [];
  this.timeout = options.timeout || 10000;
  this.store = options.store;
  this.randomize = options.randomize !== false;
  this.reconnectInterval = options.reconnectInterval || 500;
}


/**
 * Plugin function for Client. Extend client by running plugin.
 *
 * @param {function} plugin(Client)
 */
Client.use = function use(plugin) {
  plugin(Client);
  return Client;
};

Client.use(require('./bootstrap'));
Client.use(require('./actions'));

module.exports = Client;
