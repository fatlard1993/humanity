const { nanoid } = require('nanoid');
const log = new (require('log'))({ tag: 'room' });

class Room {
	constructor(options) {
		this.id = nanoid(7);
		this.options = options;
		this.name = options.name;
		this.players = {};
		this.playerIds = [];
		this.state = {};
	}

	addPlayer(player) {
		const id = nanoid(7);

		this.players[id] = {
			id,
			...player,
		};

		this.playerIds = Object.keys(this.players);
		this.playerCount = this.playerIds.length;

		log(`[${this.name}] Added player "${id}"`);

		return this.players[id];
	}

	getPlayerByName(name) {
		const playerId = this.playerIds.find(id => this.players[id].name === name);

		return playerId && this.players[playerId];
	}

	removePlayer(id) {
		if (!id || !this.players[id]) return;

		delete this.players[id];

		log(`[${this.name}] Removed player "${id}"`);
	}

	broadcast(type, payload) {
		log(1)(`[${this.name}] broadcast`, type, payload, this.playerIds);

		const message = JSON.stringify({ type, payload });

		this.playerIds.forEach(id => {
			const socket = this.players[id].socket;

			if (socket && socket.readyState === 1) socket.send(message);
		});
	}
}

module.exports = Room;
