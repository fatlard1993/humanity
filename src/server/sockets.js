const log = new (require('log'))({ tag: 'sockets' });

const server = require('./server');
const humanity = require('./humanity');
const cards = require('./cards');

const sockets = {
	init: function () {
		const { sendError } = sockets;
		const { createRoom } = humanity;

		server.socketServer.registerEndpoints({
			create: function (options) {
				createRoom(options);

				this.reply('create', options);
			},
			get_random_white: function () {
				this.reply('random_white', cards.getRandomWhite());
			},
			join: function ({ room, roomId, playerId }) {
				log('Player joining room: ', { room, roomId, playerId });

				const { rooms } = humanity;

				if (room === 'lobby') rooms.lobby.addPlayer(this);
				else if (room === 'create') {
					this.reply('state', { packs: Object.keys(cards.packs), randomName: cards.getRandomWhite() });
				} else if (room === 'join') {
					this.reply('state', { room: { name: rooms[roomId]?.name }, randomName: cards.getRandomWhite() });
				} else if (room === 'game') {
					if (!rooms[roomId]) return sendError(this, 'join', 'This room does not exist');

					this.roomId = roomId;
					this.playerId = playerId;

					rooms[roomId].playerJoin({ id: playerId, socket: this });
				}
			},
			register: function ({ name, roomId, type }) {
				log(`Player "${name}" registering for "${type}" in room: ${roomId}`);

				const { rooms } = humanity;

				if (!rooms[roomId]) return sendError(this, 'register', 'This room does not exist');

				rooms[roomId].registerPlayer({ name, type, socket: this });
			},
			player_update: function ({ roomId, playerId, update }) {
				const { rooms } = humanity;

				rooms[roomId].updatePlayer({ id: playerId, update });
			},
			nudge: function ({ roomId, playerId }) {
				const { rooms } = humanity;

				if (!rooms[roomId]) return sendError(this, 'nudge', 'This room does not exist');
				if (!rooms[roomId] || !rooms[roomId].players[playerId]) return sendError(this, 'nudge', 'This player does not exist in this room');

				log(`Nudge player: ${roomId} ${playerId}`);

				rooms[roomId].players[playerId].socket.reply('player_nudge', 100);
			},
			client_disconnect: function (data) {
				log('client_disconnect', data, this.roomId, this.playerId);

				const { rooms } = humanity;

				if (this.roomId && rooms[this.roomId]) rooms[this.roomId].removePlayer(this.playerId);
			},
		});

		log(1)('- Loaded WebSocket Endpoints -');
	},
	sendError(socket, type, error) {
		log.error(`[${type}]`, error);

		socket.reply(type, { error });
	},
};

module.exports = sockets;
