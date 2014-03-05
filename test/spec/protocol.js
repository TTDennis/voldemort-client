/* */
var Request  = require('../../lib/protocol/request');
var Response = require('../../lib/protocol/response');
var chai = require('chai');

describe('Protocol', function() {
  describe('Request', function() {
    var key   = 'SorcerersStone';
    var store = 'Hogwarts';

    it('encodes/decodes correctly', function() {
      var req = Request.get(key, {store: store}).serialize();
      var decoded = Request.fromBuffer(req);
      chai.expect(decoded.store).to.equal(store);
    });
  });
  describe('Response', function() {

  });
});