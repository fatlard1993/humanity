const uuid = require('uuid').v4;
const util = require('js-util');
const log = require('log');
const BaseGame = require('byod-game-engine/server/game');

const cards = require('./cards');
const cardCast = require('./cardCast');
const GameRoom = require('./gameRoom');
const LobbyRoom = require('./lobbyRoom');

class Game extends BaseGame {
	constructor(rootFolder, port){
		super(rootFolder, port);

		(require('./router'))(rootFolder, this.httpServer);

		this.cards = cards.load(rootFolder);

		const game = this;

		this.sockets.registerEndpoints({
			create_room: function(options){
				//todo validation on options

				game.rooms[options.name] = new GameRoom(options, game);

				this.reply('create_room', true);
			},
			join_room: function(payload){
				log('[game] join_room', payload);

				var room = this.roomName = payload.room;

				if(room === 'lobby'){
					if(!game.rooms.lobby) game.rooms.lobby = new LobbyRoom({ name: 'lobby' }, game);

					game.rooms.lobby.addPlayer(this);
				}

				else if(room === 'create'){
					game.cards = cards.load(rootFolder, (packs) => { this.reply('create_data', { name: game.getRandomWhite(packs), packs }); });
				}

				else if(room === 'cardCast'){
					//
				}

				else if(payload.gameRoom){
					this.name = payload.name;

					room = this.roomName = payload.gameRoom;

					if(!game.rooms[room]) return this.reply('join_room', { err: 'Game room does not exist' });
					if(!game.rooms[room].players[this.name]) return this.reply('join_room', { err: 'Player does not exist' });
					if(game.rooms[room].players[this.name].state !== 'inactive') return this.reply('join_room', { err: 'Player already playing' });

					game.rooms[room].players[this.name].socket = this;
					game.rooms[room].players[this.name].state = this.state = 'joined';

					this.reply('player_update', { state: this.state, hand: game.rooms[room].players[this.name].hand });

					this.reply('join_room', { options: game.rooms[room].options });

					if(game.rooms[room].state.stage === 'end') game.rooms[room].changeStage('new');

					else game.rooms[room].sendUpdate();
				}

				else log.error(`[game] Unhandled join_room`, payload);
			},
			player_register: function(payload){
				log('[game] player_register', payload);

				if(game.rooms[payload.room] && game.rooms[payload.room].players[payload.name] && game.rooms[payload.room].players[payload.name].state !== 'inactive') return this.reply('player_register', { err: 'That player is already playing' });

				this.name = payload.name;
				this.type = payload.action;
				this.roomName = payload.room;

				game.rooms[this.roomName].addPlayer(this);

				this.reply('player_register', payload);
			},
			player_update: function(payload){
				log('[game] player_update', this.name, payload);

				var previousState = game.rooms[this.roomName].players[this.name].state;

				game.rooms[this.roomName].players[this.name].state = this.state = payload.state;

				if(payload.submission){
					if(game.rooms[this.roomName].state.submissions[payload.submission]){
						game.rooms[this.roomName].players[this.name].state = previousState;

						return this.reply('player_submission', { err: 'That card has already been submitted' });
					}

					game.rooms[this.roomName].players[this.name].submission = payload.submission;

					game.rooms[this.roomName].players[this.name].hand[game.rooms[this.roomName].players[this.name].hand.indexOf(payload.submission)] = game.rooms[this.roomName].drawWhites(1);

					this.reply('player_update', { state: this.state, hand: game.rooms[this.roomName].players[this.name].hand });
				}

				else if(payload.trash){
					for(var x = 0, count = payload.trash.length; x < count; ++x){
						game.rooms[this.roomName].players[this.name].hand[game.rooms[this.roomName].players[this.name].hand.indexOf(payload.trash[x])] = game.rooms[this.roomName].drawWhites(1);

						game.rooms[this.roomName].players[this.name].hand.push(game.rooms[this.roomName].drawWhites(1));
					}

					this.reply('player_update', { state: this.state, hand: game.rooms[this.roomName].players[this.name].hand });
				}

				else if(payload.vote){
					game.rooms[this.roomName].players[this.name].vote = payload.vote;

					this.reply('player_update', { state: this.state });
				}

				else this.reply('player_update', { state: this.state });

				game.rooms[this.roomName].sendUpdate();
				game.rooms[this.roomName].checkState();
			},
			player_nudge: function({ name }){
				log(`Nudge player: ${name}`);

				game.rooms[this.roomName].players[name].socket.reply('player_nudge', 100);
			},
			client_disconnect: function(data){
				log('[game] client_disconnect', data);

				if(this.roomName && game.rooms[this.roomName]) game.rooms[this.roomName].removePlayer(this);
			}
		});

		cardCast.init(this.sockets, rootFolder);
	}

	getRandomWhite(packs){
		var pack = util.randFromArr(Object.keys(packs));

		return util.randFromArr(packs[pack].whites);
	}
}

module.exports = Game;