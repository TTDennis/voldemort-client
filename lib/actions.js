
var debug = require('debug')('voldemort:actions');
var async = require('async');
var Request = require('./protocol/request');
var versioning = require('./versioning');
var errors = require('./errors');
var VoldemortConnection = require('./connection');

module.exports = function(Client) {


  /**
   * Close the client connection
   *
   * @param {socket} connection
   * @param {function} callback
   * @api public
   */
  function close(done) {
    done = done || function() {};
    if(!this.connection) {
      return done();
    }
    this.connection.end();
    done();
  }
  Client.prototype.close = close;


  /**
   * Set the connection timeout for all requests
   *
   * @param {integer} timeout
   * @api public
   */
  Client.prototype.setTimeout = function(timeout) {
    if(this.connection) {
      this.connection.setTimeout(timeout);
    }
    this.timeout = timeout;
  };


  /**
   * Connect to the next available node in the cluster
   * Callbacks with new connection on success
   *
   * @param {function} callback
   * @api private
   */
  Client.prototype.reconnect = function reconnect(attemptNo, done) {
    var client = this;
    attemptNo = attemptNo || 1;

    if(attemptNo > this.nodes.length) {
      return done(new Error('Unable to reconnect'));
    }

    debug('reconnecting');
    client.close();

    client.nodeId = (client.nodeId + attemptNo) % client.nodes.length;
    debug('connecting to node'+client.nodeId);
    VoldemortConnection.connect(client.nodes[client.nodeId],
      function(err, connection) {
        if(err) return client.reconnect(++attmptNo, done);
        client.connection = connection;
        done(null, client);
      });
  };


  /**
   * Reconnect to a new node in cluster if the request count has exceeded
   * Callbacks with new connection or null, if no reconnect needed
   *
   * @param {function} callback
   * @api private
   */
  Client.prototype.maybeReconnect = function maybeReconnect(done) {
    if(this.connection.requestCount &&
        this.connection.requestCount % this.reconnectInterval === 0) {
      this.reconnect(1, done);
    } else {
      done();
    }
  };


  /**
   * Wraps the sendRequest method of connection with maybeReconnect
   * @param {Request}
   * @param {function}
   * @api private
   */
  Client.prototype.sendRequest = function(request, attemptNo, done) {
    if(typeof attemptNo === 'function') {
      done = attemptNo;
      attemptNo = 1;
    }

    var client = this;
    this.maybeReconnect(function(err) {
      if(err) return done(err);

      client.connection.sendRequest(request, function(err, res) {
        if(err instanceof errors.Timeout) {
          client.reconnect(attemptNo, client.sendRequest.bind(client, request, attemptNo, done));
        } else {
          done(err, res);
        }
      });
    });
  };


  /**
   * Get key from store. Returns one or more values, depending on the current
   * conflictResolver (see Client#)
   *
   * @param {*} key
   * @param {Object} options [optional]
   * @param {function} callback
   * @api public
   */
  Client.prototype.get = function(key, options, done) {
    if(arguments.length === 2) {
      done = options;
      options = {};
    }
    options = options || {};
    options.store = options.store || this.store;

    var client = this;
    var request = Request.get(key, options);

    this.sendRequest(request, function(err, res) {
      if(err) return done(err);
      if(!res) return done(null, null);

      var value = res.versioned[0];

      if(res.versioned.length > 1) {
        value = client.conflictResolver(res.versioned);
      }
      if(!options.raw) {
        value.value = client.valueSerializer.deserialize(value.value);
      }

      done(null, value);
    });
  };


  Client.prototype.getAll = function(keys, options, done) {
    if(typeof options === 'function') {
      done = options;
      options = {};
    }
    options = options || {};
    options.store = options.store || this.store;

    var client = this;
    var request = Request.getAll(keys, options);

    this.sendRequest(request, function(err, res) {
      if(err) return done(err);
      if(!res) return done(null, {});

      var value = {};
      res.values.map(function(keyedversion) {
        var k = client.keySerializer.deserialize(keyedversion.key);
        value[k] = client.conflictResolver(keyedversion.versions);
        value[k].value = client.valueSerializer.deserialize(value[k].value);
      });

      done(null, value);
    });
  };


  /**
   * Execute a put request using the given key and value. If no version is
   * specified a get(key) request will be done to get the current version. The
   * updated version is returned.
   *
   * @param {*} key
   * @param {Object} options [optional]
   * @param {function} callback
   * @api public
   */
  Client.prototype.put = function(key, value, options, done) {
    if(typeof options === 'function') {
      done = options;
      options = null;
    }
    options = options || {};
    options.store = options.store || this.store;

    debug('Putting '+key+' : '+value);
    var client = this;
    var version = options.version;
    delete options.version;
    async.waterfall([
      function(next) {
        if(!version) {
          debug('Put: Fetching old version');
          client.get(key, options, function(err, res) {
            var newVersion =
              versioning.incrementVersion(res ? res.version : null, client.nodeId);

            next(null, newVersion);
          });
        } else {
          next(null, version);
        }
      },
      function(version, next) {
        options.version = version;
        var request = Request.put(key, client.valueSerializer.serialize(value), options);
        client.sendRequest(request, function(err, res) {
          if(err) return done(err);

          var ver = versioning.toVersioned(value, version);
          ver.value = client.valueSerializer.deserialize(ver.value);
          done(null, ver);
        });
      }
    ], done);


  /**
   * Execute a delete request using the given key. If no version is
   * specified a get request will be made to get the current version.
   * On success nothing is returned.
   *
   * @param {*} key
   * @param {Object} options [optional]
   * @param {function} callback
   * @api public
   */
  Client.prototype.del = function(key, options, done) {
    if(typeof options === 'function') {
      done = options;
      options = null;
    }

    options = options || {};
    options.store = options.store || this.store;

    debug('Deleting '+key);
    var client = this;
    var version = options.version;
    // delete options.version;
    options.version = null;
    async.waterfall([
      function(next) {
        if(!version) {
          debug('Delete: Fetching old version');
          client.get(key, options, function(err, res) {
            if(err) return next(err);
            next(null, res.version);
          });
        } else {
          next(null, version);
        }
      },
      function(version, next) {
        options.version = version;
        var request = Request.del(key, options);
        client.sendRequest(request, done);
      }
    ], done);
  };
};
};
