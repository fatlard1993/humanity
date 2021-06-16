const uuid = require('uuid').v4;
const Room = require('byod-game-engine/server/room');

class LobbyRoom extends Room {
	constructor(options, game){
		super(options, game);

		return this;
	}

	addPlayer(socket){
		super.addPlayer({ name: uuid(), socket });

		this.sendUpdate();
	}

	sendUpdate(){
		const rooms = {};

		Object.keys(this.game.rooms).forEach(id => {
			const { name, options, players, playerNames } = this.game.rooms[id];
			const room = { id, name, options, players: 0 };

			if(name === 'lobby') return;

			playerNames.forEach((name) => {
				if(players[name].type === 'play' && players[name].state !== 'inactive'){
					++room.players;
				}
			})

			rooms[id] = room;
		});

		this.state.rooms = rooms;

		this.broadcast('state', { rooms });
	}
}

module.exports = LobbyRoom;