var Client = require('../../lib/client');
var client = new Client();

var port = 6666;
var host = 'localhost';

describe('client', function() {
  before(function(done) {
    client = new Client('someStore', [{hostName: host, port: port}], 500);
    client.init(done);
  })
  after(function(done) {
    client.close(done);
  });

  it('initializes correctly', function() {

  });
});