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

  it('can parse protobuf', function encProto(done) {
    var msgBuilder = require('../../lib/protobuf')('client');
    var Msg = msgBuilder.build('voldemort');
    if(!Msg) {
      return done(new Error('Could not create message builder from protobuf'));
    }
    debugger;
    var req = new Msg.VoldemortRequest({
      // node_id: 1,
      // version: 3
      type:         0,
      should_route: false,
      store:        'SomeStore',
      // get: '',
      // getAll: '',
      // put: '',
      // delete: '',
      // requestRouteType: ''
    });
    req.encode().toString('base64');

    done();
  });
});