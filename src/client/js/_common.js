import Log from 'log';
import dom from 'dom';
import socketClient from 'socket-client';

const log = new Log({ verbosity: parseInt(dom.storage.get('logVerbosity') || 0) });

socketClient.on('close', function(evt){
	log()('socket disconnect', arguments);

	if(evt.code !== 1005) socketClient.reconnect();
});

const playerColor = function(str){
	var hash = 0, colour = '#', x;

	for(x = 0; x < str.length; ++x) hash = str.charCodeAt(x) + ((hash << 5) - hash);

	hash *= 100;

	for(x = 0; x < 3; ++x) colour += `00${((hash >> (x * 8)) & 0xFF).toString(16)}`.substr(-2);

	return colour;
};