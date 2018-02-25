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

			setTimeout(function(){ socket.send(`{ "command": "challenge" }`); }, 200);

			var validConnection = false;

			var Player = {
				disconnect: function(){
					Sockets[Player.name +'_disconnect_TO'] = setTimeout(function(){
						if(!Sockets.games[Player.room]) return Log(1)('socket', 'player left non-existent room');
						if(!Sockets.games[Player.room].players.includes(Player.name)) return Log(1)('socket', 'player left a room they wernt in');

						Sockets.games[Player.room].players.splice(Sockets.games[Player.room].players.indexOf(Player.name), 1);

						if(Sockets.games[Player.room].readyPlayers.includes(Player.name)) Sockets.games[Player.room].readyPlayers.splice(Sockets.games[Player.room].readyPlayers.indexOf(Player.name), 1);
						if(Player.voted) --Sockets.games[Player.room].voteCount;

						if(Player.submission){
							for(var x = 0; x < Sockets.games[Player.room].submissions.length; ++x){
								if(Sockets.games[Player.room].submissions[x].submission === Player.submission) Sockets.games[Player.room].submissions.splice(x, 1);
							}
						}

						Sockets.games[Player.room].checkState();

						Log()(`Player "${Player.name}" left ${Player.room} | Players left: ${Sockets.games[Player.room].players}`);

						Sockets.wss.broadcast(JSON.stringify({ command: 'player_leave', room: Player.room, name: Player.name }));

						Sockets.wss.broadcast(JSON.stringify({ command: 'lobby_reload', games: Sockets.games, packs: Object.keys(Cards.packs) }));
					}, 10 * 1000);
				}
			};

			socket.onmessage = function(message){
				Log(3)(message);

				var data = JSON.parse(message.data);

				if(data.command === 'test'){
					Log()('socket', 'test');
				}

				else if(data.command === 'challenge_response'){
					Log()('socket', 'challenge_response');

					validConnection = true;

					if(data.room === 'lobby'){
						socket.send(JSON.stringify({ command: 'challenge_accept', games: Sockets.games, packs: Object.keys(Cards.packs) }));
					}

					else if(data.room.startsWith('player')){
						var room = data.room.replace(/^player_/, '');

						if(!Sockets.games[room]) return socket.send('{ "command": "goto_lobby" }');

						socket.send(JSON.stringify({ command: 'challenge_accept', players: Sockets.games[room].players, readyPlayers: Sockets.games[room].readyPlayers, gameState: Sockets.games[room].state }));
					}
				}

				if(!validConnection) return;

				if(data.command === 'lobby_new_game'){
					Log()('socket', 'lobby_new_game');

					Sockets.games[data.options.name] = {
						name: data.options.name,
						packs: data.options.packs,
						options: data.options,
						cards: Cards.get(data.options.packs),
						playerHands: {},
						state: 'new',
						scores: {},
						players: [],
						readyPlayers: [],
						submissions: [],
						currentVotes: {},
						voteCount: 0,
						checkState: function(forceChange){
							var waitingOn = Cjs.differenceArr(this.players, this.readyPlayers), x;

							if(!this.players.length) this.newBlack();

							else if(this.state === 'new'){
								if(this.players.length === this.readyPlayers.length){
									this.state = 'entering_submissions';
									this.readyPlayers = [];

									Log()('Changing state: ', this.state);

									if(this.options.submissionTimer){
										Log()('Enabling submission timer for: ', this.options.submissionTimer);

										setTimeout(function(){
											Sockets.games[data.options.name].checkState(1);
										}, (this.options.submissionTimer + 5) * 1000);
									}

									Sockets.wss.broadcast(JSON.stringify({ command: 'player_start_entering_submissions', room: this.name }));
								}
								else{
									Log()('Waiting for '+ waitingOn +' to be ready');
								}
							}

							else if(this.state === 'entering_submissions'){
								if((this.players.length - (this.options.lastManOut ? 1 : 0)) === this.submissions.length || forceChange){
									this.state = 'voting';
									this.readyPlayers = [];

									if(this.options.npcCount){
										for(x = 0; x < this.options.npcCount; ++x){
											this.submissions.push({ player: this.newPlayerName(), submission: this.newWhite() });
										}
									}
									if(this.options.fillInMissing && waitingOn.length){
										for(x = 0; x < waitingOn.length; ++x){
											this.submissions.push({ player: this.newPlayerName(), submission: this.newWhite() });
										}
									}

									Log()('Changing state: ', this.state);

									if(this.options.voteTimer){
										Log()('Enabling vote timer for: ', this.options.voteTimer);

										setTimeout(function(){
											Sockets.games[data.options.name].checkState(1);
										}, (this.options.voteTimer + 5) * 1000);
									}

									Sockets.wss.broadcast(JSON.stringify({ command: 'player_start_voting', room: this.name, submissions: this.submissions }));
								}
								else{
									Log()('Waiting for '+ waitingOn +' to make a submission');
								}
							}

							else if(this.state === 'voting'){
								if((this.players.length - (this.options.lastManOut ? 1 : 0)) === this.voteCount || forceChange){
									var mostVotesOnSingleSubmission = 0, votedEntryNames = Object.keys(this.currentVotes), votedEntryCount = votedEntryNames.length;

									for(x = 0; x < votedEntryCount; ++x){
										if(this.currentVotes[votedEntryNames[x]].count > mostVotesOnSingleSubmission) mostVotesOnSingleSubmission = this.currentVotes[votedEntryNames[x]].count;
									}

									for(x = 0; x < votedEntryCount; ++x){
										if(this.currentVotes[votedEntryNames[x]].count && this.currentVotes[votedEntryNames[x]].count > 0){
											if(!this.scores[this.currentVotes[votedEntryNames[x]].player]) this.scores[this.currentVotes[votedEntryNames[x]].player] = { votes: 0, winningVotes: 0, wins: 0, points: 0 };

											var newVotes = this.currentVotes[votedEntryNames[x]].count;

											if(newVotes === mostVotesOnSingleSubmission){
												this.currentVotes[votedEntryNames[x]].winner = true;

												++this.scores[this.currentVotes[votedEntryNames[x]].player].wins;
												this.scores[this.currentVotes[votedEntryNames[x]].player].winningVotes += newVotes;
											}

											this.scores[this.currentVotes[votedEntryNames[x]].player].votes += newVotes;

											var newWins = this.currentVotes[votedEntryNames[x]].winner ? 1 : 0;
											var mod = (newWins + 1 + (newWins ? (this.players.length - votedEntryCount) + (votedEntryCount === 2 ? 1 : 0) : 0));

											this.scores[this.currentVotes[votedEntryNames[x]].player].points += newVotes * mod;

											Log()(`${this.currentVotes[votedEntryNames[x]].player} got ${newVotes * mod} points with a modifier of: ${mod}`);
										}
									}

									Log()('socket', 'player_vote_results', this.currentVotes);

									var scorePlayerNames = Object.keys(this.scores), scorePlayerCount = scorePlayerNames.length;
									var gameWinner;

									for(x = 0; x < scorePlayerCount; ++x){
										if(this.options.winGoal && this.scores[scorePlayerNames[x]].wins >= this.options.winGoal) gameWinner = scorePlayerNames[x];
										if(this.options.pointGoal && this.scores[scorePlayerNames[x]].points >= this.options.pointGoal) gameWinner = scorePlayerNames[x];
									}

									Sockets.wss.broadcast(JSON.stringify({ command: 'player_vote_results', room: this.name, votes: this.currentVotes, scores: Sockets.games[this.name].scores, gameWinner: gameWinner }));

									if(gameWinner){
										this.scores = {};
										this.playerHands = {};
									}

									this.newBlack();

									this.state = 'new';
									this.players = [];
									this.readyPlayers = [];
									this.submissions = [];
									this.currentVotes = {};
									this.voteCount = 0;
								}
								else{
									Log()('Waiting for '+ waitingOn +' to vote');
								}
							}

							if(waitingOn.length) Sockets.wss.broadcast(JSON.stringify({ command: 'player_waiting_on', room: this.name, players: waitingOn }));
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
						},
						newWhite: function(){
							var totalWhites = this.cards.whites.length;
							var randWhite = Cjs.randInt(0, totalWhites);

							var newWhite = this.cards.whites[randWhite];

							this.cards.whites.splice(randWhite, 1);

							if(newWhite === 'undefined' || newWhite === undefined){
								if(!this.cards.whites.length) this.cards = Cards.get(this.packs.length ? this.packs : ['base']);

								return this.newWhite();
							}

							return newWhite;
						},
						newPlayerName: function(){
							var totalWhites = this.cards.whites.length;
							var totalBlacks = this.cards.blacks.length;
							var x, name;

							for(x = 0; x < totalWhites; ++x){
								if(/^[^\s]+$/.test(this.cards.whites[x])){
									name =	this.cards.whites[x];

									this.cards.whites.splice(x, 1);

									break;
								}
							}

							if(!name){
								for(x = 0; x < totalBlacks; ++x){
									if(/^[^\s]+$/.test(this.cards.blacks[x])){
										name = this.cards.blacks[x];

										this.cards.blacks.splice(x, 1);
									}
								}
							}

							return name || 'computer';
						},
						addPlayer: function(playerName){
							clearTimeout(Sockets[playerName +'_disconnect_TO']);

							if(this.players.includes(playerName)) return;

							this.players.push(playerName);

							if(!this.playerHands[playerName] || !this.options.persistentWhites){
								this.playerHands[playerName] = [];

								for(var x = 0; x < this.options.whiteCardCount; ++x){
									this.playerHands[playerName].push(this.newWhite());
								}
							}

							Log()(`Player "${playerName}" joined ${this.name} | Current players: ${this.players}`);

							Sockets.wss.broadcast(JSON.stringify({ command: 'player_join', room: this.name, name: playerName }));

							Sockets.wss.broadcast(JSON.stringify({ command: 'lobby_reload', games: Sockets.games, packs: Object.keys(Cards.packs) }));

							this.checkState();
						}
					};

					Sockets.games[data.options.name].newBlack();

					Log(2)('socket', 'Created New Game: ', Sockets.games[data.options.name]);

					Sockets.wss.broadcast(JSON.stringify({ command: 'lobby_reload', games: Sockets.games, packs: Object.keys(Cards.packs) }));
				}

				else if(data.command === 'player_join'){
					Log()('socket', 'player_join');

					if(!Sockets.games[data.game_room]) return socket.send('{ "command": "goto_lobby" }');

					Player.name = data.playerName;
					Player.room = data.game_room;

					Sockets.games[Player.room].addPlayer(Player.name);

					socket.send(JSON.stringify({ command: 'player_join_accept', black: Sockets.games[Player.room].currentBlack, whites: Sockets.games[Player.room].playerHands[Player.name], players: Sockets.games[Player.room].players, state: Sockets.games[Player.room].state, submissions: Sockets.games[Player.room].submissions, options: Sockets.games[Player.room].options, readyPlayers: Sockets.games[Player.room].readyPlayers }));
				}

				else if(data.command === 'player_ready_to_play'){
					Log()('socket', 'player_ready_to_play');

					if(Sockets.games[Player.room].readyPlayers.includes(Player.name)) return;

					Sockets.games[Player.room].readyPlayers.push(Player.name);

					Sockets.wss.broadcast(JSON.stringify({ command: 'player_ready', room: Player.room, name: Player.name }));

					Sockets.games[Player.room].checkState();
				}

				else if(data.command === 'player_enter_submission'){
					Log()('socket', 'player_enter_submission', data.submission);

					Sockets.games[Player.room].readyPlayers.push(Player.name);

					Player.submission = data.submission;

					Sockets.games[Player.room].submissions.push({ player: Player.name, submission: data.submission });

					Sockets.games[Player.room].checkState();

					if(data.customWhite && Sockets.games[Player.room].options.recordCustomWhites) Cards.recordCustom(data.submission);
				}

				else if(data.command === 'player_place_vote'){
					Log()('socket', 'player_place_vote', data.vote, Sockets.games[Player.room].players.length - Sockets.games[Player.room].voteCount +' votes left');

					Sockets.games[Player.room].readyPlayers.push(Player.name);

					if(!Sockets.games[Player.room].currentVotes[data.vote]){
						Sockets.games[Player.room].currentVotes[data.vote] = { count: 0 };

						for(var x = 0; x < Sockets.games[Player.room].submissions.length; ++x){
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

					Sockets.games[Player.room].addPlayer(Player.name);

					socket.send(JSON.stringify({ command: 'player_join_accept', black: Sockets.games[Player.room].currentBlack, whites: Sockets.games[Player.room].playerHands[Player.name], players: Sockets.games[Player.room].players, state: Sockets.games[Player.room].state, submissions: Sockets.games[Player.room].submissions, options: Sockets.games[Player.room].options, readyPlayers: Sockets.games[Player.room].readyPlayers }));
				}

				else if(data.command === 'player_use_white'){
					Log()('socket', 'player_use_white', data.text);

					var newWhite = Sockets.games[Player.room].newWhite();

					Sockets.games[Player.room].playerHands[Player.name][Sockets.games[Player.room].playerHands[Player.name].indexOf(data.text)] = newWhite;

					socket.send(JSON.stringify({ command: 'player_new_white', white: newWhite }));
				}

				// delete data.command;
				// if(Object.keys(data).length) Log()('socket', 'Command data: ', data, '\n');
			};

			socket.onclose = function(data){
				Log()('socket', 'onclose', data);

				if(!Player.name) return Log(1)('socket', 'undefined player left');

				Player.disconnect();
			};
		});

		return Sockets;
	}
};

module.exports = Sockets;