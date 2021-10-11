const log = new (require('log'))({ tag: 'lobby' });

const Room = require('./room');
const humanity = require('./humanity');

class Lobby extends Room {
	constructor() {
		super({ name: 'lobby' });

		this.state.rooms = {};
	}

	addPlayer(socket) {
		super.addPlayer({ socket }); // todo: remove players from the lobby on socket disconnect

		log('Player joined the lobby');

		this.sendUpdate();
	}

	updateState() {
		Object.keys(humanity.rooms).forEach(id => {
			const { name, options, players, playerIds } = humanity.rooms[id];
			const room = { id, name, options, players: 0 };

			if (name === 'lobby') return;

			playerIds.forEach(id => {
				const player = players[id];

				if (player.type === 'play' && player.state !== 'inactive') ++room.players;
			});

			this.state.rooms[id] = room;
		});
	}

	sendUpdate() {
		this.updateState();

		log('Sending state update', this.state);

		this.broadcast('state', this.state);
	}
}

module.exports = Lobby;
