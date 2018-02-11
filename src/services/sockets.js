const Log = require(process.env.DIR +'/_log.js');
const Cjs = require(process.env.DIR +'/_common.js');
const WebSocket = require('uws');

const Cards = require(process.env.DIR +'/services/cards.js');

var Sockets = {
	games: {},
	init: function(server){
		Sockets.wss = new WebSocket.Server({ server });

		Sockets.wss.on('connection', function(socket){
			Log()('\nsocket', '"Someone" connected...');

			socket.send(`{ "command": "challenge" }`);

			var validConnection = false;

			var Player = {
				allWhites: [],
				currentWhites: [],
				newWhite: function(){
					if(Player.currentWhites.length > 7) return;

					var totalWhites = Player.allWhites.length;
					var randWhite = Cjs.randInt(0, totalWhites);
					var newWhite = Player.allWhites[randWhite];

					Player.currentWhites.push(newWhite);

					Player.allWhites.splice(randWhite, 1);

					if(!newWhite){
						if(!Player.allWhites.length) Player.allWhites = Cjs.clone(Sockets.games[Player.room].cards.whites);
						return Player.newWhite();
					}

					Log()('New white', newWhite);

					socket.send(JSON.stringify({ command: 'player_new_whites', whites: Player.currentWhites }));
				},
				removeWhite: function(text){
					var newWhitesList = [];

					for(var x = 0; x < Player.currentWhites.length; ++x){
						if(Player.currentWhites[x] !== text) newWhitesList.push(Player.currentWhites[x]);
					}

					Player.currentWhites = newWhitesList;

					Player.newWhite();
				}
			};

			socket.onmessage = function(message){
				Log(3)(message);

				var data = JSON.parse(message.data);

				if(data.command === 'test'){
					Log()('socket', 'test');
				}

				else if(data.command === 'challenge_response'){
					validConnection = true;

					if(data.room === 'lobby'){
						socket.send(JSON.stringify({ command: 'challenge_accept', games: Sockets.games, packs: Object.keys(Cards.packs) }));
					}

					else if(data.room === 'player'){
						if(!Sockets.games[data.game_room]) return socket.send('{ "command": "goto_lobby" }');

						socket.send(JSON.stringify({ command: 'challenge_accept', players: Sockets.games[data.game_room].players, gameState: Sockets.games[data.game_room].state }));
					}
				}

				if(!validConnection) return;

				if(data.command === 'lobby_new_game'){
					Log()('socket', 'lobby_new_game', data.name, data.packs);

					Sockets.games[data.name] = {
						name: data.name,
						packs: data.packs,
						cards: Cards.get(data.packs),
						state: 'new',
						players: [],
						playersReady: 0,
						submissions: [],
						currentVotes: {},
						voteCount: 0,
						checkState: function(){
							if(!this.players.length) this.newBlack();

							else if(this.state === 'new' && this.players.length === this.playersReady){
								this.state = 'entering_submissions';

								Sockets.wss.broadcast(JSON.stringify({ command: 'player_start_entering_submissions', room: this.name }));
							}

							else if(this.state === 'entering_submissions' && this.submissions.length === this.players.length){
								this.state = 'voting';

								Sockets.wss.broadcast(JSON.stringify({ command: 'player_start_voting', room: this.name, submissions: this.submissions }));
							}

							else if(this.state === 'voting' && this.voteCount === this.players.length){
								this.tallyVotes();
							}
						},
						newBlack: function(){
							var totalBlacks = this.cards.blacks.length;
							var randBlack = Cjs.randInt(0, totalBlacks);

							this.currentBlack = this.cards.blacks[randBlack];

							this.cards.blacks.splice(randBlack, 1);

							if(this.currentBlack === 'undefined' || this.currentBlack === undefined){
								if(!this.cards.blacks.length) this.cards = Cards.get(this.packs.length ? this.packs : ['base']);

								return this.newBlack();
							}

							this.state = 'new';
							this.playersReady = 0;
							this.submissions = [];
							this.currentVotes = {};
							this.voteCount = 0;
						},
						tallyVotes: function(){
							var highestScore = 0, votedEntryNames = Object.keys(this.currentVotes), votedEntryCount = votedEntryNames.length;

							for(x = 0; x < votedEntryCount; ++x){
								if(this.currentVotes[votedEntryNames[x]].count > highestScore) highestScore = this.currentVotes[votedEntryNames[x]].count;
							}

							for(x = 0; x < votedEntryCount; ++x){
								if(this.currentVotes[votedEntryNames[x]].count === highestScore) this.currentVotes[votedEntryNames[x]].winner = true;
							}

							Log()('socket', 'player_vote_results', this.currentVotes);

							Sockets.wss.broadcast(JSON.stringify({ command: 'player_vote_results', room: this.name, votes: this.currentVotes }));

							this.newBlack();
						}
					};

					Sockets.games[data.name].newBlack();

					Log(2)('socket', 'Created New Game: ', Sockets.games[data.name]);

					Sockets.wss.broadcast(JSON.stringify({ command: 'lobby_reload', games: Sockets.games, packs: Object.keys(Cards.packs) }));
				}

				else if(data.command === 'player_join'){
					if(!Sockets.games[data.game_room]) return socket.send('{ "command": "goto_lobby" }');

					Player.name = data.playerName;
					Player.room = data.game_room;
					Player.allWhites = Cjs.clone(Sockets.games[Player.room].cards.whites);

					Sockets.games[Player.room].players.push(Player.name);

					for(var x = 0; x < 9; ++x) Player.newWhite();

					Log()(`Player "${Player.name}" joined ${Player.room} | Current players: ${Sockets.games[Player.room].players}`);

					socket.send(JSON.stringify({ command: 'player_join_accept', black: Sockets.games[Player.room].currentBlack, whites: Player.currentWhites, players: Sockets.games[Player.room].players, state: Sockets.games[Player.room].state, submissions: Sockets.games[Player.room].submissions }));

					Sockets.wss.broadcast(JSON.stringify({ command: 'player_join', room: Player.room, name: Player.name }));

					Sockets.wss.broadcast(JSON.stringify({ command: 'lobby_reload', games: Sockets.games, packs: Object.keys(Cards.packs) }));
				}

				else if(data.command === 'player_ready_to_play'){
					Log()('socket', 'player_ready_to_play');

					++Sockets.games[Player.room].playersReady;

					Player.ready = true;

					Sockets.wss.broadcast(JSON.stringify({ command: 'player_ready', room: Player.room, name: Player.name }));

					Sockets.games[Player.room].checkState();
				}

				else if(data.command === 'player_enter_submission'){
					Log()('socket', 'player_enter_submission', data.submission);

					Player.submission = data.submission;

					Sockets.games[Player.room].submissions.push({ player: Player.name, submission: data.submission });

					Sockets.games[Player.room].checkState();
				}

				else if(data.command === 'player_place_vote'){
					Log()('socket', 'player_place_vote', data.vote, Sockets.games[Player.room].players.length - Sockets.games[Player.room].voteCount +' votes left');

					if(!Sockets.games[Player.room].currentVotes[data.vote]){
						Sockets.games[Player.room].currentVotes[data.vote] = { count: 0 };

						for(x = 0; x < Sockets.games[Player.room].submissions.length; ++x){
							if(Sockets.games[Player.room].submissions[x].submission === data.vote) Sockets.games[Player.room].currentVotes[data.vote].player = Sockets.games[Player.room].submissions[x].player;
						}
					}

					++Sockets.games[Player.room].currentVotes[data.vote].count;
					++Sockets.games[Player.room].voteCount;

					Player.voted = true;

					Sockets.games[Player.room].checkState();
				}

				else if(data.command === 'player_play_again'){
					Log()('socket', 'player_play_again');

					socket.send(JSON.stringify({ command: 'challenge_accept', black: Sockets.games[Player.room].currentBlack, whites: Player.currentWhites, players: Sockets.games[Player.room].players }));
				}

				else if(data.command === 'player_remove_white'){
					Player.removeWhite(data.text);
				}

				delete data.command;
				if(Object.keys(data).length) Log()('socket', 'Command data: ', data, '\n');
			};

			socket.onclose = function(data){
				Log(2)('socket', 'onclose', data);

				if(!Player.name) return Log(1)('undefined player left');

				var playerNameIndex = Sockets.games[Player.room].players.indexOf(Player.name);

				Sockets.games[Player.room].players.splice(playerNameIndex, 1);

				Log()(`Player "${Player.name}" left ${Player.room} | Players left: ${Sockets.games[Player.room].players}`);

				Sockets.wss.broadcast(JSON.stringify({ command: 'lobby_reload', games: Sockets.games, packs: Object.keys(Cards.packs) }));

				Sockets.wss.broadcast(JSON.stringify({ command: 'player_leave', room: Player.room, name: Player.name }));

				if(Player.ready) --Sockets.games[Player.room].playersReady;
				if(Player.voted) --Sockets.games[Player.room].voteCount;

				Log()('Players ready: ', Sockets.games[Player.room].players.length, Sockets.games[Player.room].playersReady);

				if(!Sockets.games[Player.room].players.length) Sockets.games[Player.room].newBlack();
				else if(Sockets.games[Player.room].state === 'new' && Sockets.games[Player.room].players.length === Sockets.games[Player.room].playersReady){
					Sockets.games[Player.room].state = 'entering_submissions';
					Sockets.wss.broadcast(JSON.stringify({ command: 'player_start_entering_submissions', room: Player.room }));
				}
				else if(Sockets.games[Player.room].state === 'entering_submissions' && Player.submission){
					for(var x = 0; x < Sockets.games[Player.room].submissions.length; ++x){
						if(Sockets.games[Player.room].submissions[x].submission === Player.submission) Sockets.games[Player.room].submissions.splice(x, 1);
					}

					if(Sockets.games[Player.room].submissions.length === Sockets.games[Player.room].players.length){
						Sockets.games[Player.room].state = 'voting';

						Sockets.wss.broadcast(JSON.stringify({ command: 'player_start_voting', room: Player.room, submissions: Sockets.games[Player.room].submissions }));
					}
				}
				else if(Sockets.games[Player.room].state === 'voting' && Sockets.games[Player.room].voteCount === Sockets.games[Player.room].players.length){
					Sockets.games[Player.room].tallyVotes();
				}
			};
		});

		return Sockets;
	}
};

module.exports = Sockets;