/* global Log */

var WS = {
	room: 'default',
	disconnectedQueue: [],
	connect: function(){
		WS.active = new WebSocket('ws://'+ window.location.hostname +':'+ (window.location.port || 80));

		WS.active.onmessage = WS.onmessage_root;

		WS.active.onopen = WS.onopen_root;

		WS.active.onerror = WS.onerror_root;

		WS.active.onclose = WS.onclose_root;

		// WS.checkConnection();
	},
	disconnect: function disconnect(message){
		setTimeout(function disconnect_TO(){
			WS.active.close();

			Log.warn()(message);
		}, 200);
	},
	reconnect: function(){
		WS.reconnecting = true;

		if(WS.reconnection_TO) return;

		WS.reconnection_TO_time = WS.reconnection_TO_time || 1500;

		WS.reconnection_TO = setTimeout(function(){
			Log()('Attempting reconnection... ', WS.reconnection_TO_time);

			WS.reconnection_TO = null;
			WS.reconnection_TO_time += 200;

			WS.connect();
		}, WS.reconnection_TO_time);
	},
	send: function(json, dontRetry){
		var message = JSON.stringify(json);

		if(WS.active.readyState > 1){
			if(!dontRetry) WS.disconnectedQueue.push(message);

			WS.reconnect();
		}

		else WS.active.send(message);
	},
	onopen_root: function onopen(data){
		Log()('onopen', data);

		WS.reconnection_TO_time = null;

		if(WS.onopen) WS.onopen(data);
	},
	onmessage_root: function onmessage(message){
		Log()('message', message);

		var data = JSON.parse(message.data);

		if(data.command === 'challenge'){
			WS.send({ command: 'challenge_response', room: WS.room });
		}

		else if(data.command === 'reload'){
			setTimeout(function reload_TO(){ window.location.reload(false); }, data.delay);
		}

		else if(data.command === 'get_out') WS.disconnect(data.message);

		else if(data.command === 'goto_lobby'){
			window.location = window.location.protocol +'//'+ window.location.hostname +':'+ window.location.port +'/lobby';
		}

		else if(WS.onmessage) WS.onmessage(data);
	},
	onerror_root: function onerror(data){
		Log.error()('onerror', data);
	},
	onclose_root: function onclose(data){
		Log.warn()('onclose', data);

		// if(!data.wasClean) WS.disconnect('Socket communication has been lost!');

		// WS.active.close();

		// if(!data.wasClean)
		WS.reconnect();
	},
	flushQueue: function(){
		if(!WS.disconnectedQueue.length) return;

		WS.active.send(WS.disconnectedQueue.shift());

		WS.flushQueue();
	}
};