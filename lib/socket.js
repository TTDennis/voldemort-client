
var net = require('net');
var async = require('async');
var errors = require('./errors');

/**
 * Queued socket communication helper. Makes the socket threadsafe.
 *
 * @param {string} host
 * @param {number} port
 */
function QSocket(host, port) {
  if(!(this instanceof QSocket)) {
    return new QSocket(host, port);
  }
  this.host = host;
  this.port = port;
  // We want to only process one request at a time
  this.queue = async.queue(messageWorker.bind(this), 1);

  this.callbacks = [];
  this.timeout = 10000;
}
/**
 * Writes the message to socket and sets up callback
 *
 * @param {Object} message to be written
 * @param {function} response handler
 */
function messageWorker(task, callback) {
  this.callbacks.push(callback);
  this.socket.write(task);
}


/**
 * Opens the socket, setting up the events for processing
 * queued messages
 *
 * @param {function} connect callback
 */
QSocket.prototype.connect = function connect(options, done) {
  var self = this;
  var socket = this.socket = net.connect({
    host: this.host,
    port: this.port
  });

  socket.on('connect', function() {
    done(null, socket);
  });
  socket.on('error', function(err) {
    done(err);
  });

  socket.on('data', function(data) {
    var cb = self.callbacks.shift();
    if(cb) cb(null, data);
  });

  socket.on('timeout', function() {
    var cb = self.callbacks.shift();
    if(cb) cb(new errors.Timeout());
  });

  socket.setTimeout(options.timeout || this.timeout);
};

/**
 * Alias for socket.end. Closes the connection and cleans up.
 */
QSocket.prototype.close = QSocket.prototype.end = function () {
  this.socket.end();
};

/**
 * Send a message and wait for a response.
 *
 * @param {Object} message to be written
 * @param {function} response handler
 */
QSocket.prototype.send = function send(message, callback) {
  this.queue.push(message, callback);
};


QSocket.prototype.setTimeout = function(timeout) {
  this.socket.setTimeout(timeout);
};

module.exports = QSocket;
