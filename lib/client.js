var debug = require('debug')('voldemort:client');
var async = require('async');

module.exports = Client;
/**
 * Create a new client for <storeName>, using the cluster returned from <bootstrapUrls>.
 *
 * @option {string} storeName
 * @option {list} bootstrapUrls
 * @option {integer} optional reconnectInterval
 * @param {function} conflictResolver
 */
function Client(storeName, bootstrapUrls, reconnectInterval, conflictResolver) {
  if(!this instanceof Client) {
    return new Client(storeName, bootstrapUrls, reconnectInterval, conflictResolver);
  }
  this.storeName = storeName;
  this.requestCount = 0;
  this.conflictResolver = conflictResolver;
  this.bootstrapUrls = bootstrapUrls;

  this.nodes = ''; // get from a bootstrapUrl
  this.store = ''; // storeName in bootstrap data?

  this.nodeId = Math.floor(Math.random() * this.nodes.length); // random node in set
}


function bootstrap(done) {
  var host, client = this;
  async.detectSeries(
    this.bootstrapUrls,
    function(host, detectCb) {
      async.waterfall([
        function(next) {
          Client.createConnection({
            host: host.hostName,
            port: host.port
          }, next);
        },
        function(socket, next) {
          debug('requesting metadata');
          Client.get(socket, 'metadata', 'cluster.xml', next);
        },
        function(xml) {
          // parseNodes
          detectCb(true);
        }
      ], function(err) {
        if(err) detectCb(false);
      });
  }, function(success) {
    if(!success) {
      return done(new Error('All bootstrap attempts failed'));
    }
    done();
  });
}
Client.prototype.bootstrap = Client.prototype.init = bootstrap;

Client.use = function use(plugin) {
  plugin(Client);
  return Client;
};

Client.use(require('./connection'));
Client.use(require('./actions'));
