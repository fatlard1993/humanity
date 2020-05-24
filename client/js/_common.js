// includes log socket-client
// babel
/* global log socketClient */

socketClient.on('close', function(evt){
	log()('socket disconnect', arguments);

	if(evt.code !== 1005) socketClient.reconnect();
});