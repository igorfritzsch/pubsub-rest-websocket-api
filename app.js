
/**
 * Module dependencies.
 */

var express = require('express')
  , pubsub = require('./lib/pubsub.js')
  , rest = require('./lib/rest.js')
  , ws = require('./lib/ws.js');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.bodyParser());
app.use(express.favicon());

app.use('/style', express.static(__dirname + '/public/style'));

app.get('/', rest.index);
app.get('/topics', rest.topic); //List all topics ONLY RabbitMQ
app.post(/^\/topics\/([A-Za-z0-9\-\_\%\/]*[A-Za-z0-9\-\_])$/, rest.topic_subscribe);
app.put(/^\/topics\/([A-Za-z0-9\-\_\%\/]*[A-Za-z0-9\-\_])\/data$/, rest.topic_publish);
app.get(/^\/topics\/([A-Za-z0-9\-\_\%\/]*[A-Za-z0-9\-\_])\/data$/, rest.topic_message_get);
app.get(/^\/topics\/([A-Za-z0-9\-\_\%\/]*[A-Za-z0-9\-\_])$/, rest.topic_get);

//Connect to Broker
pubsub.connect('localhost', 61613);

//Start REST interface
app.listen(3000);

//Start WebSocket interface
ws.listen(8181);