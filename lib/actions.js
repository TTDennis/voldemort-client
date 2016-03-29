
/**
 * Dependencies
 */

var debug = require('debug')('voldemort:actions');
var async = require('async');
var versioning = require('./versioning');
var errors = require('./errors');
var Request = require('./protocol/request');
var VoldemortConnection = require('./connection');

/**
 * Exports
 */

module.exports = exports = Actions;

/**
 * Plugin
 */

function Actions (Client) {

  /**
   * Hoist
   */

  Client.prototype.close = close;

  /**
   * Close the client connection.
   *
   * @param {function} callback
   * @api public
   */

  function close (done) {
    done = done || function() {};
    if (!this.connection) return done();
    this.connection.end();
    done();
  }

  /**
   * Set the connection timeout for all requests.
   *
   * @param {number} timeout
   * @api public
   */

  Client.prototype.setTimeout = function (timeout) {
    if (this.connection)
      this.connection.setTimeout(timeout);
    this.timeout = timeout;
  };

  /**
   * Connect to the next available node in the cluster.
   *
   * @param {number} attemptNumber
   * @param {function} done
   * @api private
   */

  Client.prototype.reconnect = function reconnect (attemptNumber, done) {
    var client = this;
    if (attemptNumber > this.nodes.length)
      return done(new Error('Unable to reconnect'));
    debug('reconnecting');
    client.close();

    // Only use random node if server side routing
    if (this.routing === "server")
        client.nodeId = (client.nodeId + attemptNumber) % client.nodes.length;

    VoldemortConnection.connect(client.nodes[client.nodeId], onConnect);

    /**
     * @param {error} err
     * @param {object} connection
     */

    function onConnect (err, connection) {
      if (err) return client.reconnect(++attemptNumber, done);
      client.connection = connection;
      done(null, client);
    }
  };

  /**
   * Reconnect to a new node in cluster if the request count has exceeded.
   * Callbacks with new connection or null, if no reconnect needed.
   *
   * @param {function} callback
   * @api private
   */

  Client.prototype.maybeReconnect = function maybeReconnect (done) {
    if (!this.connection.alive()) {
      this.reconnect(0, done);
    } else if(this.connection.requestCount &&
        this.connection.requestCount % this.reconnectInterval === 0) {
      this.reconnect(1, done);
    } else {
      done();
    }
  };

  Client.prototype.changeConnection = function changeConnection(attemptNumber, node, done) {
      var client = this;
      // Limit attempts to connect to 3
      if (attemptNumber > 2)
        return done(new Error('Unable to reconnect'));
      debug('routing connection');
      client.close();
      client.nodeId = node.id;

      VoldemortConnection.connect(node, onConnect);

      /**
       * @param {error} err
       * @param {object} connection
       */

      function onConnect (err, connection) {
        if (err) return client.changeConnection(++attemptNumber, node, done);
        client.connection = connection;
        done(null, client);
      }
  };

  /**
   * Wraps the sendRequest method of connection with maybeReconnect.
   *
   * @param {Request} request
   * @param {number} attemptNumber
   * @param {function} done
   * @api private
   */

  Client.prototype.sendRequest = function (request, attemptNumber, done) {
    if (typeof attemptNumber === 'function') {
      done = attemptNumber;
      attemptNumber = 1;
    }
    var client = this;
    this.maybeReconnect(function (err) {
      if (err) return done(err);
      client.connection.sendRequest(request, function (err, res) {
        if (err instanceof errors.Timeout) {
          client.reconnect(attemptNumber, client.sendRequest.bind(client, request, attemptNumber, done));
        } else done(err, res);
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

  Client.prototype.get = function (key, options, done) {
    if (arguments.length === 2) {
      done = options;
      options = {};
    }
    options = options || {};
    options.store = options.store || this.store;

    var client = this;

    // Ignore routing option when performing get on metadata!
    if (client.routing === "client" && options.store !== "metadata") {
        var responsibleNodes = client.router.getResponsibleNodes(key);
        var randomNode = responsibleNodes[0];//[Math.floor(Math.random()*responsibleNodes.length)];
        client.changeConnection(0, randomNode, function(err, _client) {
            applyRequest(_client);
        });
    } else {
        applyRequest(client);
    }

    function applyRequest(client) {
        var request = Request.get(key, options);
        client.sendRequest(request, function (err, res) {
          debug(err);
          debug(res);

          if (err) return done(err);
          if (!res || res.versioned.length === 0) return done(null, null);

          var value = res.versioned[0];
          if (res.versioned.length > 1)
            value = client.conflictResolver(res.versioned);
          if (!options.raw)
            value.value = client.valueSerializer.deserialize(value.value);
          done(null, value);
        });
    }
  };

  /**
   * @todo write documentation
   * @api public
   */

  Client.prototype.getAll = function (keys, options, done) {
    if (typeof options === 'function') {
      done = options;
      options = {};
    }
    options = options || {};
    options.store = options.store || this.store;

    var client = this;

    if (client.routing === "client") {
        var responsibleNodes = client.router.getResponsibleNodes(key);
        var randomNode = responsibleNodes[Math.floor(Math.random()*responsibleNodes.length)];
        client.changeConnection(0, randomNode, function(err, _client) {
            applyRequest(_client);
        });
    } else {
        applyRequest(client);
    }

    function applyRequest(client) {
        var request = Request.getAll(keys, options);
        client.sendRequest(request, function(err, res) {
          if (err) return done(err);
          if (!res) return done(null, {});
          var value = {};
          res.values.map(function (keyedVersion) {
            var key = client.keySerializer.deserialize(keyedVersion.key);
            value[key] = client.conflictResolver(keyedVersion.versions);
            value[key].value = client.valueSerializer.deserialize(value[key].value);
          });
          done(null, value);
        });
    }
  };

  /**
   * Execute a put request using the given key and value. If no version is
   * specified a get(key) request will be done to get the current version. The
   * updated version is returned.
   *
   * @param {object} key
   * @param {object} value
   * @param {object} (optional) options
   * @param {function} done
   * @api public
   */

  Client.prototype.put = function (key, value, options, done) {
    if(typeof options === 'function') {
      done = options;
      options = null;
    }
    options = options || {};
    options.store = options.store || this.store;

    var client = this;

    if (client.routing === "client") {
        var responsibleNodes = client.router.getResponsibleNodes(key);
            client.changeConnection(0, responsibleNodes[0], function(err, _client) {
                applyRequest(_client,done);
            });

    } else {
        applyRequest(client, done);
    }

    function applyRequest(client, finishedReq) {
        debug('putting %s:%s', key, value);
        var version = options.version;
        delete options.version;
        var tasks = [];
        tasks.push(function (next) {
          if (!version) {
            debug('fetching old version');
            client.get(key, options, function (err, res) {
              var newVersion = versioning.incrementVersion(res ? res.version : null, client.nodeId);
              next(null, newVersion);
            });
          } else next(null, version);
        });
        tasks.push(function (version, next) {
          options.version = version;
          var request = Request.put(key, client.valueSerializer.serialize(value), options);
          client.sendRequest(request, function (err, res) {
            if (err) return finishedReq(err);
            var _version = versioning.toVersioned(value, version);
            _version.value = client.valueSerializer.deserialize(_version.value);
            next(null, _version);
          });
        });
        async.waterfall(tasks, finishedReq);
    }
  };

  /**
   * Execute a delete request using the given key. If no version is
   * specified a get request will be made to get the current version.
   * On success nothing is returned.
   *
   * @param {obect} key
   * @param {object} (optional) options
   * @param {function} callback
   * @api public
   */

  Client.prototype.del = function (key, options, done) {
    if(typeof options === 'function') {
      done = options;
      options = null;
    }
    options = options || {};
    options.store = options.store || this.store;

    var client = this;

    if (client.routing === "client") {
        var responsibleNodes = client.router.getResponsibleNodes(key);

        async.forEachOf(responsibleNodes, function(e, i, cb) {
            client.changeConnection(0, e, function(err, _client) {
                applyRequest(_client,cb);
            });
        }, function(err) {
            done();
        });
    } else {
        applyRequest(client, done);
    }

    function applyRequest(client, finishedReq) {
        debug('deleting ' + key);
        var version = options.version;
        delete options.version;
        var tasks = [];
        tasks.push(function (next) {
          if (!version) {
            debug('fetching old version');
            client.get(key, options, function (err, res) {
              next(null, res.version);
            });
          } else next(null, version);
        });
        tasks.push(function (version, next) {
          options.version = version;
          var request = Request.del(key, options);
          client.sendRequest(request, finishedReq);
        });
        async.waterfall(tasks, finishedReq);
    }
  };

}
