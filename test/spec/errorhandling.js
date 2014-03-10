
var Client = require('../../');
var server = require('../server');
var chai = require('chai');

describe('errorhandling', function() {
  var port = 7777, client;
  before(function(done) {
    server.start(port, done);
  });
  before(function(done) {
    client = Client.bootstrap({
      host: 'localhost',
      port: port,
      randomize: false // for failover testing
    }, {store: 'test'}, done);
  });

  after(function(done) {
    client.close(done);
  });
  after(function(done) {
    server.stop(done);
  });

  it('can connect with test server', function() {
    chai.assert(client.nodes);
  });

  describe('failover', function() {
    before(function initKey(done) {
      client.setTimeout(500);
      client.put('fail', 'over', function(err, result) {
        if(err) return done(err);

        version = result.version;
        done();
      });
    });
    it('writes to real node', function(done) {
      client.get('fail', function(err, res) {
        chai.expect(err).to.be.null;
        chai.expect(res).to.not.be.null;
        chai.expect(res.value.toString()).to.eql('over');
        done();
      });
    });
  });
});
