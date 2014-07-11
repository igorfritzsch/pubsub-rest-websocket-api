
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , pubsub = require('./routes/pubsub.js')
  , wssrv = require('websocket').server
  , http = require('http');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.bodyParser());
app.use(express.favicon());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', routes.index);
app.get('/topics', routes.topic); //List all topics ONLY RabbitMQ
app.post(/^\/topics\/([A-Za-z0-9\-\_\%\/]*[A-Za-z0-9\-\_])$/, routes.topic_subscribe);
app.put(/^\/topics\/([A-Za-z0-9\-\_\%\/]*[A-Za-z0-9\-\_])\/data$/, routes.topic_publish);
app.get(/^\/topics\/([A-Za-z0-9\-\_\%\/]*[A-Za-z0-9\-\_])\/data$/, routes.topic_message_get);
app.get(/^\/topics\/([A-Za-z0-9\-\_\%\/]*[A-Za-z0-9\-\_])$/, routes.topic_get);

//HTTP-Server
app.listen(3000);
var server = http.createServer();
server.listen(8181);

//Connect to Broker
pubsub.connect('localhost', 61613);

//WebSocket Server
var wss = new wssrv({
	httpServer: server,
	autoAcceptConnections: false
});

wss.on('request', function(request) {
	var connection = request.accept(null, request.origin);
	
	connection.on('message', function(message){
		try {
			var req;
			
			if(message.type === 'utf8') {
				req = JSON.parse(message.utf8Data);
			}
			else {
				req = message;
			}

			var destination = req.destination.match(/^\/topics\/([A-Za-z0-9\-\_\#\/]*[A-Za-z0-9\-\_\#])$/);
				
			if(destination !== null){
				var msg;
				switch(req.type){
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
		catch (e){
			connection.send(JSON.stringify({"return": "Invalid data."}));
		}
	});
	connection.on('close', function(reasonCode, description) {
		pubsub.unsubscribe(connection);
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});
