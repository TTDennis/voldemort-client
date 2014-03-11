
/**
 * Dependencies
 */

var defaultResolver = require('./versioning').conflictResolver;

/**
 * Create a new client for `storeName`.
 * Client must be initialized against a bootstrapUrl using client#bootstrap.
 *
 * @param {string} default storeName
 * @param {number} optional reconnectInterval
 * @param {function} optional conflictResolver
 * @param {function} optional errorHandler
 */

function Client (options) {
  if (!this instanceof Client) {
    return new Client(options);
  }
  options = options || {};
  this.conflictResolver = options.conflictResolver || defaultResolver;
  this.valueSerializer = options.valueSerializer || {
    deserialize: function (value) {
      return value.toBuffer();
    },
    serialize: function (value) {
      return new Buffer(value);
    }
  };

  this.keySerializer = options.keySerializer || {
    deserialize: function (key) {
      return key.toBuffer().toString();
    },
    serialize: function (key) {
      return key;
    }
  };

  // Bootstrap configuration
  this.nodeId = 0;
  this.nodes = [];
  this.timeout = options.timeout || 10000;
  this.store = options.store;
  this.randomize = options.randomize !== false;
  this.reconnectInterval = options.reconnectInterval || 500;
}


/**
 * Extends the Client by adding plugins.
 *
 * @param {function} plugin
 * @return {object} client
 */

Client.use = function use (plugin) {
  plugin(Client);
  return Client;
};

Client.use(require('./bootstrap'));
Client.use(require('./actions'));

module.exports = Client;
