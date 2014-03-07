
var chai = require('chai');

var Client = require('../../lib/client');

var port = 6666;
var host = 'localhost';

describe('client', function() {
  before(function(done) {
    client = new Client('test');
    client.init({host: host, port: port}, done);
  });
  after(function(done) {
    client.close(done);
  });

  it('initializes correctly', function() {
    chai.assert(client.connection);
    chai.assert(client.nodes.length >= 1);
  });
  it('can put a key', function(done) {
    client.put('chocolate', 'yuck', function(err, res) {
      if(err) return done(err);
      done();
    });
  });
  it('can get a key', function(done) {
    client.get('chocolate', function(err, res) {
      if(err) return done(err);
      chai.assert(res.value.toString() === 'yuck');
      done();
    });
  });
});
