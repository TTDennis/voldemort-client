'use strict';

const debug = require('debug')('voldemort:router');
const async = require('async');
const Long = require('long');

function Router() {
    if (!(this instanceof Router)){
        return new Router();
    }
}

Router.prototype.init = function(options) {
    this.nodes = options.nodes;
    this.stores = options.stores;
    this.partitions = this.partitionsFromNodes(this.nodes);
};

/**
 * Get a list of all nodes that hold the key
 *
 * @todo Add support for other keys than string
 * @param {string} key
 * @returns {array} responsibleNodes
 * @api public
 */

Router.prototype.getResponsibleNodes = function(key) {

    if (typeof key !== "string") {
        return new Error("Client side routing currently only works with string keys");
    }

    // @TODO: add serialization for other key types than string
    var keyBuffer = new Buffer(key);

    var masterPartition = this.getMasterPartition(keyBuffer);
    var partitionList = [masterPartition]; //this.getReplicationPartitionList(masterPartition);

    var responsibleNodes = [];

    this.nodes.forEach(function(node, nodeIndex) {
        partitionList.forEach(function(partition, partitionIndex) {
            // This node holds the partition
            node.partitions.forEach(function(nodePartition, nodePartitionIndex) {
                if (parseInt(nodePartition) === parseInt(partition)) {
                    if (responsibleNodes.indexOf(node) === -1) {
                        responsibleNodes.push(node);
                    }
                }
            });
        });
    });
    return responsibleNodes;
};


/**
 * Calculate the partition that the key is in
 *
 * @param {string} key
 * @returns {number} partitionNumber
 * @api private
 */

Router.prototype.getMasterPartition = function(key) {
    return Math.abs(this.fnvHash(key) % (Math.max(1, this.partitions.length)));
};

/**
 * Return a list of partitions that hold the keys that are held in masterPartition
 *
 * @param {number} masterPartition
 * @returns {number} partitionList
 * @api private
 */

Router.prototype.getReplicationPartitionList = function(masterPartition) {
    var partitionList = [];
    var index = masterPartition;

    for (var i = 0; i < this.partitions.length; i += 1) {
        // Only add if it's not yet there, because we're circeling
        if (partitionList.indexOf(index) === -1) {
            partitionList.push(index);
        }

        if (partitionList.length >= this.stores.replicationFactor){
            break;
        }

        index = (index + 1) % this.partitions.length;
    }
    return partitionList;
};


/**
 * Calculate the partition that the key is in
 *
 * @param {string} key
 * @returns {array} partitions
 * @api private
 */

Router.prototype.partitionsFromNodes = function(nodes) {
    let partitions = [];
    nodes.forEach(function(e, i) {
        partitions = partitions.concat(e.partitions);
    });
    partitions = partitions.filter(function(elem, pos) {
        return partitions.indexOf(elem) === pos;
    });
    return partitions;
};

/**
 * Calculate voldemorts FNV hash of key
 *
 * @param {string} key
 * @returns {number} hash
 * @api private
 */

Router.prototype.fnvHash = function(key) {
    const FNV_BASIS = new Long(0x811c9dc5);
    const FNV_PRIME = new Long((1 << 24) + 0x193);

    if (!Buffer.isBuffer(key)) {
        return new Error("Key must be a buffer");
    }

    var hash = FNV_BASIS;
    for (var i = 0; i < key.length; i += 1) {
        // hash ^= 0xFF & key[i]
        let masked = (0xFF & key.readInt8(i));
        hash = hash.xor(masked);
        // hash *= FNV_PRIME
        hash = hash.mul(FNV_PRIME);
    }
    return hash.toInt();
};

Router.prototype.mapKeys = function(keys) {
    let keymap = [];

    // Map nodeIds to keys
    // doesn't work if objects are mapped to the keys directly... whatever
    keys.forEach((key, keyIndex) => {
        const nodeId = this.getResponsibleNodes(key)[0].id;

        if(!keymap[nodeId]) {
            keymap[nodeId] = [];
        }

        keymap[nodeId].push(key);
    });

    return keymap;
};

Router.prototype.getNodeFromId = function(nodeId) {
    return this.nodes[nodeId];
};

module.exports = exports = Router;
