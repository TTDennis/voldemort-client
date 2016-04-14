'use strict';

const async = require('async');

const Router = require('./router');
const VoldemortConnection = require('./connection');
const Request = require('./protocol/request');
const defaultResolver = require('./versioning').conflictResolver;
const NodeConnection = require('./node-connection');
const versioning = require('./versioning');

function ClientHandler(options) {
	if (!(this instanceof ClientHandler)) {
		return new ClientHandler(options);
	}

	if (!(options.stores || options.nodes || options.connection)) {
		return new Error("Not all options specified");
	}

	this.metadata = {
		stores: options.stores,
		nodes: options.nodes
	};

    this.store = options.store;
	this.routing = options.routing;
	this.connection = options.connection;

	this.conflictResolver = options.conflictResolver || defaultResolver;
	this.valueSerializer = options.valueSerializer || {
		deserialize: function(value) {
			return value.toBuffer();
		},
		serialize: function(value) {
			return new Buffer(value);
		}
	};

	// Mapping nodeId -> connection
	this.establishedConnections = [];
	this.establishedConnections[options.nodeId] = options.connection;

	// Set up router
    this.router = new Router();
	this.router.init({
		nodes: options.nodes,
		stores: options.stores
	});

    this.versioning = versioning;
}

ClientHandler.prototype.changeConnection = function(node, done) {
	// See if we have the connection already
	if (this.establishedConnections.indexOf(node.id) !== -1) {
		done(null, this.establishedConnections[node.id]);
	} else {
		VoldemortConnection.connect(node, (err, connection) => {
			if (err) {
				done(err);
			} else {

                const nodeConnection = new NodeConnection({
                    connection: connection,
                    id: node.id
                });

				this.establishedConnections[node.id] = nodeConnection;
				done(null, nodeConnection);
			}
		});
	}
};

ClientHandler.prototype.prepareOperation = function(key, done) {
	// Calculate node when client routing, use random when server side
	if (this.routing === 'client') {
		var responsibleNodes = this.router.getResponsibleNodes(key);
		// TODO: why does it only work with the master node?
		this.changeConnection(responsibleNodes[0], function(err, connection) {
			done(err, connection, responsibleNodes[0]);
		});

	} else {
		// TODO: server-side routing, round robin?
		// client.nodeId = (client.nodeId + attemptNumber) % client.nodes.length;
	}
};

ClientHandler.prototype.get = function(key, options, done) {
    options.store = options.store || this.store;
	this.prepareOperation(key, function(err, nodeConnection) {
		nodeConnection.get(key, options, done);
	});
};

ClientHandler.prototype._getAll = function(node, keys, options, done) {
	this.changeConnection(node, function(err, nodeConnection) {
		nodeConnection.getAll(keys, options, done);
	});
};

ClientHandler.prototype.getAll = function(keys, options, done) {
    options.store = options.store || this.store;
	if (this.routing === 'client') {
		return done(new Error('getAll is not supported with client side routing. Use bulkGet'));
	} else {
		var responsibleNodes = this.router.getResponsibleNodes(keys[0]);
		this._getAll(responsibleNodes[0], keys, options, done);
	}
};

ClientHandler.prototype.bulkGet = function(keys, options, done) {
    options.store = options.store || this.store;
	if (this.routing === 'server') {
		this._getAll(keys, options, done);
	} else {
		var returnValues = [];
		// Sort keys in array nodeId ->[keys]
		var nodeArray = this.router.mapKeys(keys);
		async.forEachOf(nodeArray, (nodeKeys, nodeId, cb) => {
            const node = this.router.getNodeFromId(nodeId);
			this._getAll(node, nodeKeys, options, function(err, response) {
				returnValues = returnValues.concat(response);
				cb();
			});
		}, function(err) {
			if (err) {
                done(err);
            }
			else {
                done(null, returnValues);
            }
		});
	}
};

ClientHandler.prototype.put = function(key, value, options, done) {
    options.store = options.store || this.store;
	this.prepareOperation(key, function(err, nodeConnection) {
        nodeConnection.put(key, value, options, done);
	});
};

ClientHandler.prototype.del = function(key, options, done) {
    options.store = options.store || this.store;
	this.prepareOperation(key, function(err, nodeConnection) {
        nodeConnection.del(key, options, done);
	});
};

ClientHandler.prototype.close = function() {
	this.establishedConnections.forEach((e, i) => {
		e.end();
		this.establishedConnections.slice(i, 1);
	});
};

module.exports = exports = ClientHandler;
