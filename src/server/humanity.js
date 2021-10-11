const log = new (require('log'))({ tag: 'humanity' });

const humanity = {
	rooms: {},
	init() {
		humanity.rooms.lobby = new (require('./lobby'))();
	},
	createRoom(options) {
		log(1)('Create new game room', options);

		const gameRoom = new (require('./game'))(options);

		humanity.rooms[gameRoom.id] = gameRoom;

		log('Created game room', gameRoom.id);
	},
};

module.exports = humanity;
