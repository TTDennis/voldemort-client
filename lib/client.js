
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
  this.onError = function(err, done) { done(); };
  this.valueSerializer = function(a) { return a; };
  this.keySerializer = {
    deserialize: function(k) {
      return k.toBuffer().toString();
    },
    serialize: function(k) {
      return k;
    }
  };

  this.store = options.store;
  this.reconnectInterval = options.reconnectInterval || 5;

  // Bootstrap related
  this.nodeId = 0;
  this.nodes = [];
  this.timeout = 10000;
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
