/* */
var net = require('net');
var Client = require('../../lib/client');
var client = new Client();

var client;
var port = 6666;
var host = 'localhost';

describe('Protocol pb0', function() {
  before(function(done) {
    client = new Client('someStore', 'bootstrapUrl', 500);
    client.init(done);
  })
  after(function(done) {
    client.close(done);
  });

  it('can handshake', function(done) {
    client.createConnection({
      host: host, port: port
    }, done);
  });

  it('can parse protobuf', function(done) {
    done();
  });
});