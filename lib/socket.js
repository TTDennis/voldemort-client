var debug = require('debug')('voldemort:queue');
var net = require('net');
var async = require('async');

function QSocket(host, port) {
  if(!(this instanceof QSocket)) {
    return new QSocket(host, port);
  }
  this.host = host;
  this.port = port;
  this.queue = async.queue(messageWorker.bind(this), 1);
  this.callbacks = [];
}

QSocket.prototype.connect = function connect(done) {
  var self = this;
  var socket = this.socket = net.connect({
    host: this.host,
    port: this.port
  });

  socket.on('connect', function() {
    done();
  });
  socket.on('error', function(err) {
    done(err);
  });

  socket.on('data', function(data) {
    debug('Got data');
    var cb = self.callbacks.shift();
    if(cb) cb(null, data);
  });

  socket.on('timeout', function() {
    debug('Socket timeout');
    var cb = self.callbacks.shift();
    if(cb) cb(new Error('Request timed out'));
  });

  done();
};
QSocket.prototype.close = function () {
  this.socket.end();
};

QSocket.prototype.send = function send(message, callback) {
  this.queue.push(message, callback);
};

function messageWorker(task, callback) {
  this.callbacks.push(callback);
  this.socket.write(task);
}


module.exports = QSocket;
