
var Router = require('./router');


function ClientHandler(options) {
    if (!(this instanceof ClientHandler)) {
        return new ClientHandler(options);
    }

    if (!(options.stores || options.nodes || options.connection)) {
        return new Error("Not all options specified");
    }

    this.metadata.stores = options.stores;
    this.metadata.nodes = options.nodes;

    this.routing = options.routing;

    this.connection = options.connection;

    // Mapping nodeId -> connection
    this.establishedConnections = [];
    this.establishedConnections[options.nodeId] = options.connection;

    // Set up router
    Router.init({
        nodes: options.nodes,
        stores: options.stores
    });
}

ClientHandler.prototype.prepareOperation = function(key, options, done) {
    // Calculate node when client routing, use random when server side
    if (this.routing === 'client') {
        var responsibleNodes = Router.getResponsibleNodes(key);
        // TODO: why does it only work with the master node?

    } else {
        client.nodeId = (client.nodeId + attemptNumber) % client.nodes.length;
    }
};

ClientHandler.prototype.get = function(key, options, done) {

};
