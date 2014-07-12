var http = require('http')
  ,	stomp = require('stompjs');

var client,
    storage = [],
    delsubtime = 86400000; //(24 * 60 * 60 * 1000) := 24 Stunden

var on_connect = function() {
    console.log('STOMP socket connection established.');
};
var on_error = function(error) {
    console.log(error.headers.message);
};

exports.connect = function connect(host, port){
	client = stomp.overTCP(host, port);
	client.connect('guest', 'guest', on_connect, on_error, '/'); //RabbitMQ
//	client.connect('admin', 'password', on_connect, on_error); //Apollo ActiveMQ
};

exports.subscribe = function subscribe(dest, con){
	var destination_pattern	= dest.replace(/\//g, '.'),
		destination			= '/topic/' + destination_pattern,
		subscription_exist	= false;
	
	con = typeof con !== 'undefined' ? con : null;
	
	//Check whether subscription already exists or not
	storage.forEach(function(topic, index, topics){
		if(destination_pattern === topic.name){
			subscription_exist = true;
			topic.time = Date.now() + delsubtime; //Update Timestamp
			if(con !== null){
				topic.ws.push(con);
			}
			return;
		}
	});

	//If subscription not exists >> subscribe
	if(subscription_exist === false){
		var SID = client.subscribe(destination, function(data) {
			
			storage.forEach(function(topic, index, topics){
				if(SID.id === topic.sid.id){
					topic.data = data.body;
					
					topic.ws.forEach(function(connection, index, connections){
						if(connection !== null){
							topic.time = Date.now() + delsubtime; //Update Timestamp
							connection.send(data.body);
						}
					});
				}
			});
		}, { persistent: false });
		
		var STS = Date.now() + delsubtime;
		
		storage.push({'name': destination_pattern, 'data': null, 'sid': SID, 'time': STS, 'ws': [ con ]});
	}
	
	return {'topic': destination_pattern, 'type': 'subscribe', 'response': true};
};

exports.publish = function publish(dest, msg){
	var destination_pattern	= dest.replace(/\//g, '.'),
		destination	= '/topic/' + destination_pattern;

	client.send(destination, {}, msg);
	return {'topic': destination_pattern, 'type': 'publish', 'response': true};
};

exports.getTopic = function getTopic(dest){
	var destination_pattern	= dest.replace(/\//g, '.'),
		subscription_exist	= false;
	
	
	storage.forEach(function(topic, index, topics){
		if(destination_pattern === topic.name){
			subscription_exist = true;
			topic.time = Date.now() + delsubtime;
			return;
		}
	});
	
	if(subscription_exist === false){
		return {'topic': destination_pattern, 'type': 'get', 'response': false};
	}
	else{
		return {'topic': destination_pattern, 'type': 'get', 'response': true};
	}
};

exports.getTopicMessage = function getTopicMessage(dest){
	var destination_pattern	= dest.replace(/\//g, '.'),
		subscription_exist	= false,
		message;
	
	
	storage.forEach(function(topic, index, topics){
		if(destination_pattern === topic.name){
			subscription_exist = true;
			topic.time = Date.now() + delsubtime;
			try {
				message = JSON.parse(topic.data);
			}
			catch (e){
				message = topic.data;
			}
			return;
		}
	});
	
	if(subscription_exist === false){
		return {'topic': destination_pattern, 'type': 'get', 'response': false};
	}
	else{
		return {'topic': destination_pattern, 'type': 'get', 'response': true, 'message': message};
	}
};

exports.unsubscribe = function unsubscribe(con){
	
	con = typeof con !== 'undefined' ? con : null;

	storage.forEach(function(topic, index, topics){
		if(Date.now() >= topic.time){
			
			topic.sid.unsubscribe();
			storage.splice(index, 1);
			
			if(con !== null){
				var ind = topic.ws.indexOf(con);
				
				if(ind > -1){
					topic.ws.splice(ind,1);
				}
			}
		}
	});
};

//5 minute interval to check for expired subscriptions
setInterval(this.unsubscribe, 300000);
