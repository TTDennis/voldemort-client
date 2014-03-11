/**
 * Dependencies
 */

var chai = require('chai');
var Request = require('../../lib/protocol/request');

/**
 * Suite
 */

describe('Protocol', function () {
  describe('Request', function () {
    var key   = 'SorcerersStone';
    var store = 'Hogwarts';

    it('encodes/decodes correctly', function() {
      var req = Request.get(key, {store: store}).toBuffer();
      var decoded = Request.fromBuffer(req);
      chai.expect(decoded.store).to.equal(store);
    });
  });

  describe('Response', function () {
    it('encodes/decodes correctly', function () {
      // @todo @wejendorp
    });
  });
});
