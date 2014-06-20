
/*
 * GET home page.
 */

var http = require('http'),
	pubsub = require('./pubsub.js');

exports.index = function(req, res){
	res.render('index', { title: 'TKN: Publish/Subscribe REST/WebSocket API' });
};

exports.topic = function(req, res){
	var request_queues = http.request({
		host: 'localhost',
		port: 15672,
		method: 'GET',
		path: '/api/bindings',
		auth: 'guest:guest'
	}, function(response){
		response.on('data', function(data){
			try {
				var arr = JSON.parse(data),
					queues = [];
				arr.forEach(function(element, index, array){
					if(element.source === 'amq.topic' && element.vhost === '/') {
						var vhost		= element.vhost,
							vhost_addr	= 'http://' + req.host + ':3000/topics/',
							topic		= element.routing_key.replace(/\//g, '.'),
							topic_addr	= 'http://' + req.host + ':3000/topics/' + topic.replace(/\./g, '/').replace(/\#/g, '%23'),
							data_addr	= topic_addr + '/data';
						queues.push({'topic': {'name': topic, 'topic_addr': topic_addr, 'data_addr': data_addr}});
					}
				});
				res.send(queues);
			}
			catch (e){
				res.send(405);
			}
		});
	});
	request_queues.end();
};

exports.topic_subscribe = function(req, res){
	var msg = pubsub.subscribe(req.params[0]);
	if (msg.response === false){
		res.send(405);
	}
	else{
		res.send(msg);
	}
};

exports.topic_publish = function(req, res){
	var msg = pubsub.publish(req.params[0], req.body);
	if (msg.response === false){
		res.send(405);
	}
	else{
		res.send(msg);
	}
};

exports.topic_get = function(req, res){
	var msg = pubsub.getTopic(req.params[0]);
	if (msg.response === false){
		res.send(404);
	}
	else{
		res.send(msg);
	}
};

exports.topic_message_get = function(req, res){
	var msg = pubsub.getTopicMessage(req.params[0]);
	if (msg.response === false){
		res.send(404);
	}
	else{
		res.send(msg);
	}
};
