
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
function Client(storeName, reconnectInterval, conflictResolver, errorHandler) {
  if(!this instanceof Client) {
    return new Client(storeName, reconnectInterval, conflictResolver);
  }

  this.conflictResolver = conflictResolver || defaultResolver;
  this.onError = function(err, done) { done(); };
  this.valueSerializer = function(a) { return a; };
  this.store = storeName;

  this.reconnectInterval = reconnectInterval || 5;
  // Bootstrap related
  this.nodeId = 0;
  this.nodes = [];
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
