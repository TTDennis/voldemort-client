'use strict';

const async = require('async');
const parse = require('xml2js').parseString;

const ClientHandler = require('./lib/client-handler');
const VoldemortConnection = require('./lib/connection');
const NodeConnection = require('./lib/node-connection');
const Node = require('./lib/node');

function VoldemortClient() {
	if (!(this instanceof VoldemortClient)) {
		return new VoldemortClient();
	}
}

VoldemortClient.prototype.bootstrap = function(nodes, options, done) {
	// Bootstrap configuration
	this.nodeId = 0;
	this.nodes = [];
	this.timeout = options.timeout || 10000;
	this.store = options.store;
	this.reconnectInterval = options.reconnectInterval || 500;
	this.routing = options.routing || "server";

    const self = this;

	this.bootstrap_node(nodes, options, function(err) {
		if (!err) {
            self.getStoreMetadata(function(err) {
                if (!err) {
                    const clientHandler = new ClientHandler({
        				stores: self.stores,
        				nodes: self.nodes,
        				routing: self.routing,
        				connection: self.connection,
                        store: self.store,
        				conflictResolver: options.conflictResolver,
        				valueSerializer: options.valueSerializer
        			});
                    done(null, clientHandler);
                } else {
                    return new Error(err);
                }
            });
		}
	});
};

VoldemortClient.prototype.bootstrap_node = function(hosts, options, done) {
	if (typeof options === 'function') {
		done = options;
		options = {};
	}

    const self = this;

	// Tasks that will connect to a cluster and parse its information.
	function tryHost(host, detect) {
		var tasks = [];
		tasks.push(function getConnection(done) {
			VoldemortConnection.connect({
				host: host.host,
				port: host.port,
				timeout: self.timeout
			}, done);
		});
		tasks.push(function getMetadata(socket, done) {
			self.connection = socket;
			self.nodeConnection = new NodeConnection({
				connection: socket
			});
			self.nodeConnection.get('cluster.xml', {
				store: 'metadata',
				raw: true
			}, done);
		});
		tasks.push(function getNodes(response, err, done) {
			Node.fromXml(response.value.toBuffer(), done);
		});
		tasks.push(function onSuccess(nodes) {
			self.nodes = nodes;
			detect(!!nodes.length);
		});

		async.waterfall(tasks, function(err) {
			if (err) {
				detect(false);
			}
		});
	}

	hosts = Array.isArray(hosts) ? hosts : [hosts];

	// Serialize and return on first successful connect.
	async.detectSeries(hosts, tryHost, function(success) {
		if (!success) {
			return done(new Error('All bootstrap attempts failed'));
		} else {
            done();
        }
	});
};

VoldemortClient.prototype.getStoreMetadata = function(done) {
    const self = this;
	this.nodeConnection.get('stores.xml', {
		store: 'metadata',
		raw: true
	}, function(err, response) {
        parse(response.value.toBuffer(), function(err, data) {
            if (err) {
                return done(new Error("Couldn't parse"));
            }
            var stores = {
                routingStrategy: data.stores.store[0]['routing-strategy'][0],
                routing: data.stores.store[0].routing[0],
                replicationFactor: data.stores.store[0]['replication-factor'][0],
                keyType: data.stores.store[0]['key-serializer'][0].type[0]
            };
            self.stores = stores;
            done(null, stores);
        });
	});
};

module.exports = exports = VoldemortClient;
