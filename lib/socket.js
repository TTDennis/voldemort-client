
/**
 * Dependencies
 */
var debug = require('debug')('voldemort:socket');
var net = require('net');
var async = require('async');
var Frap = require('frap');
var through = require('through');
var errors = require('./errors');


/**
 * Exports
 */

module.exports = exports = QSocket;

/**
 * Queued socket communication helper. Makes the socket threadsafe.
 *
 * @param {string} host
 * @param {number} port
 */

function QSocket (host, port) {
  if(!(this instanceof QSocket))
    return new QSocket(host, port);
  this.host = host;
  this.port = port;
  // We want to only process one request at a time.
  this.queue = async.queue(messageWorker.bind(this), 1);
  this.callbacks = [];
  this.timeout = 10000;
}

/**
 * Writes the message to socket and sets up callback.
 *
 * @param {object} message to be written
 * @param {function} response handler
 */

function messageWorker (task, done) {
  this.callbacks.push(done);
  this.socket.write(task);
}

/**
 * Opens the socket, setting up the events for processing
 * queued messages
 *
 * @param {object} options
 * @param {function} done
 */

QSocket.prototype.connect = function connect (options, done) {
  var self = this;
  var socket = this.socket = net.connect({
    host: this.host,
    port: this.port
  });
  socket.on('connect', function() {
    self.alive = true;
    done(null, socket);
  });
  socket.on('error', function (err) {
    done(err);
  });

  var bufs = [], received = 0, size = 0;
  var frameStream = through();

  socket.on('data', function (chunk) {
    if(self.handshake)
      return frameStream.write(chunk);

    self.handshake = chunk;
    cb = self.callbacks.shift();
    if (cb) return cb(null, chunk);
  });

  var framed = new Frap(frameStream, {emit: 'frame'});
  framed.on('frame', function(buffers, totalLength) {
    cb = self.callbacks.shift();
    if (cb) cb(null, Buffer.concat(buffers, totalLength));
  });

  socket.on('timeout', function () {
    debug('Socket timeout');
    socket.end();
    self.alive = false;
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

QSocket.prototype.send = function send (message, done) {
  this.queue.push(message, done);
};

/**
 * Sets the timeout of the internal socket.
 *
 * @param {number} timeout
 */

QSocket.prototype.setTimeout = function (timeout) {
  this.socket.setTimeout(timeout);
};
