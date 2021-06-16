const util = require('js-util');
const log = new (require('log'))({ tag: 'game' });
const BaseGame = require('byod-game-engine/server/game');

const cards = require('./cards');
const GameRoom = require('./gameRoom');
const LobbyRoom = require('./lobbyRoom');

class Game extends BaseGame {
	constructor(rootFolder, port){
		super(rootFolder, port);

		require('./router');

		this.cards = cards.load(rootFolder);

		const game = this;

		this.sockets.registerEndpoints({
			create_room: function(options){
				// todo validate options
				const gameRoom = new GameRoom(options, game);

				game.rooms[gameRoom.id] = gameRoom;

				this.reply('create_room', true);
			},
			join_room: function(payload){
				log('join_room', payload);

				var room = this.roomID = payload.room;

				if(room === 'lobby'){
					if(!game.rooms.lobby) game.rooms.lobby = new LobbyRoom({ name: 'lobby' }, game);

					game.rooms.lobby.addPlayer(this);
				}

				else if(room === 'create'){
					game.cards = cards.load(rootFolder, (packs) => {
						this.reply('create_data', { packs });

						this.reply('random_white', game.getRandomWhite(packs));
					});
				}

				else if(room === 'join'){
					let roomData;

					Object.keys(game.rooms).forEach(id => {
						const { name } = game.rooms[id];

						if (id === payload.id) roomData = { id, name };
					});

					this.reply('join_data', roomData || { error: `No room found by id: ${payload.id}` });

					cards.load(rootFolder, (packs) => {
						this.reply('random_white', game.getRandomWhite(packs));
					});
				}

				else if(payload.gameRoom){
					room = this.roomID = payload.gameRoom;

					if(!game.rooms[room]) return this.reply('join_room', { error: 'Game room does not exist' });

					this.name = game.rooms[room].playerNames.find(name => game.rooms[room].players[name].id === payload.player);

					if(!game.rooms[room].players[this.name]) return this.reply('join_room', { error: 'Player does not exist' });
					if(game.rooms[room].players[this.name].state !== 'inactive') return this.reply('join_room', { error: 'Player already playing' });

					game.rooms[room].players[this.name].socket = this;
					game.rooms[room].players[this.name].state = this.state = 'joined';

					this.reply('player_update', { state: this.state, hand: game.rooms[room].players[this.name].hand });

					this.reply('join_room', { options: game.rooms[room].options });

					if(game.rooms[room].state.stage === 'end') game.rooms[room].changeStage('new');

					else game.rooms[room].sendUpdate();
				}

				else log.error(`Unhandled join_room`, payload);
			},
			get_random_white: function(){
				cards.load(rootFolder, (packs) => {
					this.reply('random_white', game.getRandomWhite(packs));
				});
			},
			player_register: function(payload){
				log('player_register', payload);

				const { roomID, name, action } = payload;

				if(game.rooms[roomID] && game.rooms[roomID].players[name] && game.rooms[roomID].players[name].state !== 'inactive') return this.reply('player_register', { error: 'A player by that name is already playing' });

				this.name = name;
				this.type = action;
				this.roomID = roomID;

				game.rooms[this.roomID].addPlayer(this);

				this.id = game.rooms[roomID].players[name].id;

				this.reply('player_register', { ...payload, playerID: this.id });
			},
			player_update: function(payload){
				log('player_update', this.name, payload);

				const player = game.rooms[this.roomID].players[this.name];

				game.rooms[this.roomID].players[this.name].state = this.state = payload.state;

				if(payload.submission){
					if(game.rooms[this.roomID].state.submissions[payload.submission]){
						game.rooms[this.roomID].players[this.name].state = player.state;

						return this.reply('player_submission', { error: 'That card has already been submitted' });
					}

					game.rooms[this.roomID].players[this.name].submission = payload.submission;

					game.rooms[this.roomID].players[this.name].hand[player.hand.indexOf(payload.submission)] = game.rooms[this.roomID].drawWhites(1);

					this.reply('player_update', { state: this.state, hand: player.hand });
				}

				else if(payload.trash){
					for(var x = 0, count = payload.trash.length; x < count; ++x){
						game.rooms[this.roomID].players[this.name].hand[player.hand.indexOf(payload.trash[x])] = game.rooms[this.roomID].drawWhites(1);

						game.rooms[this.roomID].players[this.name].hand.push(game.rooms[this.roomID].drawWhites(1));
					}

					this.reply('player_update', { state: this.state, hand: player.hand });
				}

				else if(payload.vote){
					game.rooms[this.roomID].players[this.name].vote = payload.vote;

					this.reply('player_update', { state: this.state });
				}

				else this.reply('player_update', { state: this.state });

				game.rooms[this.roomID].sendUpdate();
				game.rooms[this.roomID].checkState();
			},
			player_nudge: function({ name }){
				log(`Nudge player: ${name}`);

				game.rooms[this.roomID].players[name].socket.reply('player_nudge', 100);
			},
			client_disconnect: function(data){
				log('client_disconnect', data);

				if(this.roomID && game.rooms[this.roomID]) game.rooms[this.roomID].removePlayer(this);
			}
		});
	}

	getRandomWhite(packs){
		var pack = util.randFromArr(Object.keys(packs));

		return util.randFromArr(packs[pack].whites);
	}
}

module.exports = Game;