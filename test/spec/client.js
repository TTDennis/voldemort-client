
var async = require('async');
var chai = require('chai');
var spies = require('chai-spies');
chai.use(spies);

var Client = require('../../');
var protocol = require('../../lib/protocol/protobuf')('client');

var port = 6666;
var host = 'localhost';

describe('client', function() {
  before(function(done) {
    client = Client.bootstrap({host: host, port: port}, {
      store: 'test',
      valueSerializer: {
        deserialize: function(b) { return b.toBuffer().toString(); },
        serialize: function(v) { return v; }
      }
    }, done);
  });

  after(function(done) {
    client.close(done);
  });

  it('initializes correctly', function() {
    chai.assert(client.connection);
    chai.assert(client.nodes.length >= 1);
  });


  describe('#put', function() {
    var version;
    it('succeeds for non-versioned', function(done) {
      client.put('chocolate', 'yum', function(err, result) {
        chai.assert(version = result.version);
        done();
      });
    });

    it('fails for outdated version', function(done) {
      client.put('chocolate', 'yum', function(err, result) {
        if(err) return done(err);

        client.put('chocolate', 'yuck', {version: result.version}, function(err) {
          chai.assert(err, 'Put should fail');
          done();
        });
      });
    });
  });

  function getNull(key, done) {
    client.get(key, function(err, res) {
      if(err) return done(err);

      chai.assert(res === null);
      done();
    });
  }

  describe('#get', function() {
    var version;
    before(function initKey(done) {
      client.put('chocolate', 'yum', function(err, result) {
        if(err) return done(err);

        version = result.version;
        done();
      });
    });

    it('retrieves value', function(done) {
      client.get('chocolate', function(err, res) {
        if(err) return done(err);

        chai.expect(res.value).to.eql('yum');
        done();
      });
    });
    it('returns null on non-existing key', function(done) {
      getNull('cookieMonster', done);
    });
  });

  describe('#getAll', function() {
    var version;
    before(function initKey(done) {
      client.put('chocolate', 'yum', function(err, result) {
        if(err) return done(err);

        version = result.version;
        client.put('cookie', 'nom', function(err, result) {
          done();
        });
      });
    });

    it('retrieves values', function(done) {
      client.getAll(['chocolate', 'cookie'], function(err, res) {
        if(err) return done(err);
        chai.expect(res.chocolate.value).to.eql('yum');
        chai.expect(res.cookie.value).to.eql('nom');
        done();
      });
    });
    it('returns empty object for missing keys', function(done) {
        client.getAll(['houdini'], function(err, res) {
          if(err) return done(err);

          chai.expect(res.houdini).to.be.undefined;
          chai.expect(res).to.eql({});
          done();
        });
    });
  });


  describe('#del', function() {
    var version;
    before(function initKey(done) {
      client.put('chocolate', 'yum', function(err, result) {
        if(err) return done(err);

        version = result.version;
        done();
      });
    });

    it('removes a key', function(done) {
      client.del('chocolate', version, function(err) {
        if(err) return done(err);

        getNull('chocolate', done);
      });
    });
  });


  describe('#reconnect', function() {
    var $n = 10;
    var orig, spy;

    beforeEach(function() {
      orig = client.reconnect;
      spy = chai.spy(client.reconnect);
      client.reconnect = spy;
    });
    afterEach(function() {
      client.reconnect = orig;
    });


    it('reconnects after $n requests', function(done) {
      client.reconnectInterval = $n;
      var gets = Array.apply(null, Array($n)).map(function() {
        return function(callback) {
          client.get('test', callback);
        };
      });
      async.series(gets, function(err, results) {
        chai.expect(spy).to.have.been.called.once;
        done();
      });
    });
  });
});
