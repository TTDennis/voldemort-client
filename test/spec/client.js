
/**
 * Dependencies
 */

var async = require('async');
var chai = require('chai');
var spies = require('chai-spies');
var protocol = require('../../lib/protocol/protobuf')('client');
var Client = require('../../');

/**
 * Chai Plugins
 */

chai.use(spies);

/**
 * Setup
 */

var port = 6666;
var host = 'localhost';

/**
 * Suite
 */

describe('client', function () {

  /**
   * Custom assert to see if a response is null.
   */

  function getNull (key, done) {
    client.get(key, function (err, res) {
      if(err) return done(err);
      chai.assert (res === null);
      done();
    });
  }

  before(function (done) {
    client = Client.bootstrap({ host: host, port: port }, {
      store           : 'test',
      valueSerializer : {
        // @todo @wejendorp b & v?
        deserialize : function (b) { return b.toBuffer().toString(); },
        serialize   : function (v) { return v; }
      }
    }, done);
  });

  after(function (done) {
    client.close(done);
  });

  it('initializes correctly', function () {
    chai.assert(client.connection);
    chai.assert(!!client.nodes.length);
  });

  describe('#put', function() {
    var version;

    it('succeeds for non-versioned', function (done) {
      client.put('chocolate', 'yum', function (err, result) {
        chai.assert(version = result.version);
        done();
      });
    });

    it('fails for outdated version', function (done) {
      client.put('chocolate', 'yum', function (err, result) {
        if (err) return done(err);
        client.put('chocolate', 'yuck', { version: result.version }, function (err) {
          chai.assert(err, 'put should fail');
          done();
        });
      });
    });
  });

  describe('#get', function () {
    var version;

    before(function initKey (done) {
      client.put('chocolate', 'yum', function (err, result) {
        if (err) return done(err);
        version = result.version;
        done();
      });
    });

    it('retrieves value', function (done) {
      client.get('chocolate', function (err, res) {
        if (err) return done(err);
        chai.expect(res.value).to.eql('yum');
        done();
      });
    });

    it('returns null on non-existing key', function (done) {
      getNull('cookieMonster', done);
    });
  });

  describe('#getAll', function() {
    var version;

    before(function initKey(done) {
      client.put('chocolate', 'yum', function (err, result) {
        if (err) return done (err);
        version = result.version;
        client.put('cookie', 'nom', done);
      });
    });

    it('retrieves values', function (done) {
      client.getAll(['chocolate', 'cookie'], function (err, res) {
        if (err) return done(err);
        chai.expect(res.chocolate.value).to.eql('yum');
        chai.expect(res.cookie.value).to.eql('nom');
        done();
      });
    });

    it('returns empty object for missing keys', function (done) {
      client.getAll(['houdini'], function (err, res) {
        if (err) return done(err);
        chai.expect(res.houdini).to.be.undefined;
        chai.expect(res).to.eql({});
        done();
      });
    });
  });

  describe('#del', function() {
    var version;

    before(function initKey(done) {
      client.put('chocolate', 'yum', function (err, result) {
        if (err) return done(err);
        version = result.version;
        // done();
        client.put('cookie', 'nom', done);
      });
    });

    it('removes a key', function (done) {
      client.del('cookie', function (err) {
        if (err) return done(err);
        getNull('cookie', done);
      });
    });

    it('removes a key with specific version', function (done) {
      client.del('chocolate', { version: version }, function (err) {
        if (err) return done(err);
        getNull('chocolate', done);
      });
    });
  });

  describe('#reconnect', function () {
    var interval = 10;
    var orig;
    var spy;

    beforeEach(function() {
      orig = client.reconnect;
      spy = chai.spy(client.reconnect);
      client.reconnect = spy;
    });

    afterEach(function() {
      client.reconnect = orig;
    });

    it('reconnects after [reconnectInterval] requests', function(done) {
      client.reconnectInterval = interval;

      var gets = Array.apply(null, Array(interval+2)).map(function(v,i) {
        return function(callback) {
          client.get('test', function(err) {
            callback(err);
          });
        };
      });

      async.series(gets, function(err, results) {
        chai.expect(spy).to.have.been.called.once;
        done(err);
      });
    });
  });
});
