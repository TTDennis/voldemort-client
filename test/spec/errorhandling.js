
/**
 * Dependencies
 */

var chai = require('chai');
var Client = require('../../');
var server = require('../server');

/**
 * Suite
 */

describe('errorhandling', function () {
  var port = 7777, client;

  before(function (done) {
    server.start(port, done);
  });

  before(function (done) {
    client = Client.bootstrap({
      host : 'localhost',
      port : port
    }, {
      store     : 'test',
      // Use randomize:false to do failover testing
      randomize : false
    }, done);
  });

  after(function (done) {
    client.close(done);
  });

  after(function (done) {
    server.stop(done);
  });

  it('can connect with test server', function () {
    chai.assert(client.nodes);
  });

  describe('failover', function () {
    before(function initKey (done) {
      client.setTimeout(500);
      client.put('fail', 'over', function (err, result) {
        if (err) return done(err);
        version = result.version;
        done();
      });
    });

    it('writes to real node', function (done) {
      client.get('fail', function (err, res) {
        chai.expect(err).to.be.null;
        chai.expect(res).to.not.be.null;
        chai.expect(res.value.toString()).to.eql('over');
        done();
      });
    });
  });

  describe('bootstrap', function () {

    it('skips invalid hosts', function (done) {
      Client.bootstrap([
        {},
        { host: 'somehost' },
        { host: 'localhost', port: port }
      ], function (err, client) {
        chai.expect(err).to.be.null;
        chai.expect(client.nodes).to.have.length(2);
        client.close(done);
      });
    });

    it('errbacks for failed hosts', function (done) {
      Client.bootstrap([
        { host: 'somehost1', port: 3333 },
        { host: 'somehost2', port: 3333 }
      ], function (err, client) {
        chai.expect(err).to.not.be.null;
        chai.expect(err.message).to.eql('All bootstrap attempts failed');
        done();
      });
    });

    it('errbacks for non-ok protocol', function (done) {
      var server = require('net').createServer(function (conn) { //'connection' listener
        conn.on('data', function (data) {
          conn.write('no');
        });
      }).listen(9938);
      Client.bootstrap({ host:'localhost', port: 9938 }, function (err, client) {
        chai.expect(err).to.not.be.null;
        chai.expect(err.message).to.eql('All bootstrap attempts failed');
        server.close();
        done();
      });
    });
  });
});
