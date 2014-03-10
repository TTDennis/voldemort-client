
// Test server, that we will use to bootstrap against
// Only responds with cluster.xml and ok for protocol


var debug = require('debug')('voldemort:server');

var msgBuilder = require('../lib/protocol/protobuf')('client');
var protocol = msgBuilder.build('voldemort');

var fs = require('fs');
var net = require('net');
var Long = require('long');

var server = net.createServer(function(c) { //'connection' listener
  c.on('data', function(data) {
    if(data.toString() === 'pb0') {
      c.write('ok');
    } else {
      pbResponder(c, data);
    }
  });
});


function pbResponder(connection, request) {
  var size = request.readInt32BE(0);
  request = request.slice(4);

  request = protocol.VoldemortRequest.decode(request);

  // Fake cluster info
  if(request.type === protocol.RequestType.GET &&
    request.get.key.toBuffer().toString() === 'cluster.xml') {

    var data = new protocol.GetResponse({
      versioned: new protocol.Versioned({
        value: fs.readFileSync(__dirname+'/cluster.xml'),
        version: new protocol.VectorClock({
          entries: [new protocol.ClockEntry({
            node_id: 0,
            version: Long.fromInt(1)
          })]
        })
      })
    }).toBuffer();

    var respSize = new Buffer(4);
    respSize.writeInt32BE(data.length, 0);

    var response = Buffer.concat([respSize, data]);
    connection.write(response);
  }
}


exports.start = function(port, done) {
  server.listen(port, done);
};

exports.stop = function(done) {
  server.close(done);
};
