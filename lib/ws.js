var http = require('http')
  , pubsub = require('./pubsub.js')
  , wssrv = require('websocket').server;

var server,
    wss;

exports.listen = function listen(port){

  server = http.createServer();
  server.listen(port);

  wss = new wssrv({
    httpServer: server,
    autoAcceptConnections: false
  });

  wss.on('request', function(request) {
    var connection = request.accept(null, request.origin);
	
    connection.on('message', function(message) {
      try {  	  
        var req = JSON.parse(message.utf8Data),
            destination = req.destination.match(/^\/topics\/([A-Za-z0-9\-\_\#\/]*[A-Za-z0-9\-\_\#])$/);

        if (destination !== null) {
          var msg;
          switch (req.type) {
            case 'subscribe':
              msg = pubsub.subscribe(destination[1], connection);
              connection.send(JSON.stringify(msg));
              break;
            case 'publish':
              msg = pubsub.publish(destination[1], req.message);
              connection.send(JSON.stringify(msg));
              break;
            default:
              connection.send(JSON.stringify({'type': req.type, 'response': false}));
          }
        }
        else {
          connection.send(JSON.stringify({"return": "Invalid destination."}));
        }
      }
      catch (e) {
        connection.send(JSON.stringify({"return": "Invalid data."}));
      }
    });
	
    connection.on('close', function(reasonCode, description) {
      pubsub.unsubscribe(connection);
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
    
  });
};