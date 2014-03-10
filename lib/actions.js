
var debug = require('debug')('voldemort:actions');
var async = require('async');
var Request = require('./protocol/request');
var versioning = require('./versioning');
var VoldemortConnection = require('./connection');

module.exports = function(Client) {


  /**
   * Close the client connection
   *
   * @param {socket} connection
   * @param {function} callback
   */
  function closeConnection(done) {
    done = done || function() {};
    if(!this.connection) {
      return done();
    }
    this.connection.end();
    done();
  }
  Client.prototype.close = closeConnection;


  /**
   * Connect to the next available node in the cluster
   * Callbacks with new connection on success
   *
   * @param {function} callback
   * @api private
   */
  Client.prototype.reconnect = function reconnect(done) {
    var client = this;
    debug('reconnecting');

    client.close();

    function onConnect(err, connection) {
      if(err) return done(err);

      client.connection = connection;
      done(null, client.connection);
    }
    var range = Array.apply(null, Array(this.nodes.length))
      .map(function(v,i) { return i+1; });

    // async
    // Serialize async and return on first successful connect:
    async.detectSeries(
      range,
      function(i, cb) {
        client.nodeId = (client.nodeId + i) % client.nodes.length;
        debug('connecting to node'+client.nodeId);
        VoldemortConnection.connect(client.nodes[client.nodeId],
          function(err, connection) {
            if(err) return cb(false);
            client.connection = connection;
            cb(true);
          });
      },
      function(success) {
        if(success) {
          return done();
        }
        done(new Error('Unable to reconnect'));
      }
    );
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
      this.reconnect(done);
    } else {
      done();
    }
  };


  /**
   * Wraps the sendRequest method of connection with maybeReconnect
   * @param {Request}
   * @param {function}
   */
  Client.prototype.sendRequest = function(request, done) {
    var client = this;
    this.maybeReconnect(function(err) {
      if(err) return done(err);
      client.connection.sendRequest(request, done);
    });
  };


  /**
   * Get key from store. Returns one or more values, depending on the current
   * conflictResolver (see Client#)
   *
   * @param {*} key
   * @param {Object} options [optional]
   * @param {function} callback
   */
  Client.prototype.get = function(key, options, done) {
    if(typeof options === 'function') {
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
          debug('Fetching old version');
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
        var request = Request.put(key, value, options);
        client.sendRequest(request, function(err, res) {
          // Put returns new version
          if(err) return done(err);
          done(null, versioning.toVersioned(value, version));
        });
      }
    ], done);


  Client.prototype.maybePut = function(key, value, options, done) {
    // Exceptions?
  };

  Client.prototype.del = function(key, options, done) {
    options = options || {};
    options.store = options.store || this.store;

    debug('Deleting '+key);
    var client = this;
    var version = options.version;
    delete options.version;
    async.waterfall([
      function(next) {
        if(!version) {
          debug('Fetching old version');
          client.get(key, options, function(err, res) {
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
