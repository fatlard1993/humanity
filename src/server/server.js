const log = new (require('log'))({ tag: 'humanity' });
const path = require('path');
const WebsocketServer = require('websocket-server');

const server = {
	init: function (options) {
		this.options = options;
		this.httpServer = require('http-server').init(options.port, path.join(__dirname, '../..'), '/lobby');
		this.socketServer = new WebsocketServer({ server: this.httpServer.app.server });

		require('./cards').init();

		require('./humanity').init();

		require('./router').init();

		require('./sockets').init();

		log(`Loaded humanity @ localhost:${options.port}`);
	},
	rootFolder: path.join(__dirname, '../..'),
	rootPath: function () {
		return path.join(server.rootFolder, ...arguments);
	},
};

module.exports = server;
