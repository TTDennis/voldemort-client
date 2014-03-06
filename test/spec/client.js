var chai = require('chai');

var Client = require('../../lib/client');

var port = 6666;
var host = 'localhost';

describe('client', function() {
  before(function(done) {
    client = new Client('someStore');
    client.init({hostName: host, port: port}, done);
  });
  after(function(done) {
    client.close(done);
  });

  it('initializes correctly', function() {
    chai.assert(client.connection);
    chai.assert(client.nodes.length === 1);
  });
});
