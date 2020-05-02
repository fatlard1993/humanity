const log = require('log');
const util = require('js-util');
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
		var x = 0, room, rooms = {}, roomNames = Object.keys(this.game.rooms), count = roomNames.length;

		for(; x < count; ++x){
			if(roomNames[x] === 'lobby') continue;

			room = this.game.rooms[roomNames[x]];

			rooms[roomNames[x]] = {
				players: 0,
				options: room.options
			};

			for(var y = 0, yCount = room.playerNames.length; y < yCount; ++y){
				if(room.players[room.playerNames[y]].type === 'play' && room.players[room.playerNames[y]].state !== 'inactive') ++rooms[roomNames[x]].players;
			}
		}

		this.state.rooms = rooms;

		this.broadcast('state', { rooms });
	}
}

module.exports = 	LobbyRoom;