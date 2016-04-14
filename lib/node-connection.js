'use strict';

const Request = require('./protocol/request');
const defaultResolver = require('./versioning').conflictResolver;
const versioning = require('./versioning');
const async = require('async');

function NodeConnection(options) {
	if (!options.connection) {
		return new Error('No connection provided');
	}
	this.connection = options.connection;
	this.id = options.id;

	this.conflictResolver = options.conflictResolver || defaultResolver;
	this.valueSerializer = options.valueSerializer || {
		deserialize: function(value) {
			return value.toBuffer();
		},
		serialize: function(value) {
			return new Buffer(value);
		}
	};
	this.keySerializer = options.keySerializer || {
		deserialize: function(key) {
			return key.toBuffer().toString();
		},
		serialize: function(key) {
			return key;
		}
	};

}

NodeConnection.prototype.get = function(key, options, done) {
	var request = Request.get(key, options);
	this.connection.sendRequest(request, (err, res) => {

		if (err) {
			return done(err);
		}
		if (!res || res.versioned.length === 0) {
			return done(null, null, this.id);
		}

		var value = res.versioned[0];

		if (res.versioned.length > 1) {
			value = this.conflictResolver(res.versioned);
		}
		if (!options.raw) {
			value.value = this.valueSerializer.deserialize(value.value);
		}
		done(null, value, this.id);
	});
};

NodeConnection.prototype.getAll = function(keys, options, done) {
	var request = Request.getAll(keys, options);
	this.connection.sendRequest(request, (err, res) => {

		if (err) {
			return done(err);
		}
		if (!res) {
			return done(null, {});
		}

		var value = {};

		res.values.map((keyedVersion) => {
			var key = this.keySerializer.deserialize(keyedVersion.key);
			value[key] = this.conflictResolver(keyedVersion.versions);
			value[key].value = this.valueSerializer.deserialize(value[key].value);
		});
		done(null, value);
	});
};

NodeConnection.prototype.put = function(key, value, options, done) {
	options = options || {};

	var version = options.version;
	delete options.version;

	var tasks = [];

	tasks.push((next) => {
		if (!version) {
			this.get(key, options, (err, res, nodeId) => {
				var newVersion = versioning.incrementVersion(res ? res.version : null, nodeId);
				next(null, newVersion);
			});
		} else {
			next(null, version);
		}
	});
	tasks.push((version, next) => {
		options.version = version;

		var request = Request.put(key, this.valueSerializer.serialize(value), options);

		this.connection.sendRequest(request, (err, res) => {
			if (err) {
				return done(err);
			}
			var _version = versioning.toVersioned(value, version);
			_version.value = this.valueSerializer.deserialize(_version.value);
			next(null, _version);
		});
	});
	async.waterfall(tasks, done);
};

NodeConnection.prototype.del = function(key, options, done) {
	options = options || {};

	var version = options.version;
	delete options.version;

	var tasks = [];

	tasks.push((next) => {
		if (!version) {
			this.get(key, options, (err, res) => {
				next(null, res.version);
			});
		} else {
			next(null, version);
		}
	});
	tasks.push((version, next) => {
		options.version = version;
		var request = Request.del(key, options);
		this.connection.sendRequest(request, next);
	});
	async.waterfall(tasks, done);
};

NodeConnection.prototype.end = function() {
	this.connection.end();
};

module.exports = exports = NodeConnection;
