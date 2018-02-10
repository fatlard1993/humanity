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
					var randWhite = Cjs.randInt(0, totalWhites + 1);
					var newWhite = Player.allWhites[randWhite];

					Player.currentWhites.push(newWhite);

					Player.allWhites.splice(randWhite, 1);

					Log()('New white', newWhite);

					socket.send(JSON.stringify({ command: 'new_whites', whites: Player.currentWhites }));
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

						Player.name = data.playerName;
						Player.room = data.game_room;
						Player.allWhites = Cjs.clone(Sockets.games[Player.room].cards.whites);

						Sockets.games[Player.room].players.push(Player.name);

						for(var x = 0; x < 9; ++x) Player.newWhite();

						Log()(`Player "${Player.name}" joined ${Player.room} | Current players: ${Sockets.games[Player.room].players}`);

						socket.send(JSON.stringify({ command: 'challenge_accept', black: Sockets.games[data.game_room].currentBlack, whites: Player.currentWhites }));

						Sockets.wss.broadcast(JSON.stringify({ command: 'reload_lobby', games: Sockets.games, packs: Object.keys(Cards.packs) }));
					}
				}

				if(!validConnection) return;

				if(data.command === 'new_game'){
					Log()('socket', 'new_game', data.name, data.timer, data.packs);

					Sockets.games[data.name] = {
						name: data.name,
						timer: data.timer * (1000 * 60),
						players: [],
						currentGuesses: [],
						currentVotes: {},
						voteCount: 0,
						cards: Cards.get(data.packs.length ? data.packs : ['base']),
						newBlack: function(){
							var totalBlacks = Sockets.games[this.name].cards.blacks.length;
							var randBlack = Cjs.randInt(0, totalBlacks + 1);

							Sockets.games[this.name].currentBlack = Sockets.games[this.name].cards.blacks[randBlack];

							Sockets.games[this.name].cards.blacks.splice(randBlack, 1);

							Sockets.games[this.name].started = false;
							Sockets.games[this.name].currentGuesses = [];
							Sockets.games[this.name].currentVotes = {};
							Sockets.games[this.name].voteCount = 0;
						}
					};

					Sockets.games[data.name].newBlack();

					Log(2)('socket', 'Created New Game: ', Sockets.games[data.name]);

					Sockets.wss.broadcast(JSON.stringify({ command: 'reload_lobby', games: Sockets.games, packs: Object.keys(Cards.packs) }));
				}

				else if(data.command === 'game_guess'){
					Log()('socket', 'game_guess', data.guess, Sockets.games[Player.room].players.length - Sockets.games[Player.room].currentGuesses.length +' guesses left', Sockets.games[Player.room].started ? 'started' : 'NOT started');

					Player.currentGuess = data.guess;

					Sockets.games[Player.room].currentGuesses.push({ player: Player.name, guess: data.guess });

					if(Sockets.games[Player.room].started && Sockets.games[Player.room].currentGuesses.length === Sockets.games[Player.room].players.length){
						Sockets.wss.broadcast(JSON.stringify({ command: 'vote', submissions: Sockets.games[Player.room].currentGuesses }));
					}
				}

				else if(data.command === 'game_vote'){
					Log()('socket', 'game_vote', data.vote);

					if(!Sockets.games[Player.room].currentVotes[data.vote]){
						Sockets.games[Player.room].currentVotes[data.vote] = { count: 0 };

						for(x = 0; x < Sockets.games[Player.room].currentGuesses.length; ++x){
							if(Sockets.games[Player.room].currentGuesses[x].guess === data.vote) Sockets.games[Player.room].currentVotes[data.vote].player = Sockets.games[Player.room].currentGuesses[x].player;
						}
					}

					++Sockets.games[Player.room].currentVotes[data.vote].count;
					++Sockets.games[Player.room].voteCount;

					if(Sockets.games[Player.room].voteCount === Sockets.games[Player.room].players.length){
						var highestScore = 0, votedEntryNames = Object.keys(Sockets.games[Player.room].currentVotes), votedEntryCount = votedEntryNames.length;

						for(x = 0; x < votedEntryCount; ++x){
							if(Sockets.games[Player.room].currentVotes[votedEntryNames[x]].count > highestScore) highestScore = Sockets.games[Player.room].currentVotes[votedEntryNames[x]].count;
						}

						for(x = 0; x < votedEntryCount; ++x){
							if(Sockets.games[Player.room].currentVotes[votedEntryNames[x]].count === highestScore) Sockets.games[Player.room].currentVotes[votedEntryNames[x]].winner = true;
						}

						Log()('socket', 'vote_results', Sockets.games[Player.room].currentVotes);

						Sockets.wss.broadcast(JSON.stringify({ command: 'vote_results', votes: Sockets.games[Player.room].currentVotes }));

						Sockets.games[Player.room].newBlack();
					}
				}

				else if(data.command === 'play_again'){
					Log()('socket', 'play_again');

					socket.send(JSON.stringify({ command: 'challenge_accept', black: Sockets.games[Player.room].currentBlack }));
				}

				else if(data.command === 'game_start' && Sockets.games[Player.room] && !Sockets.games[Player.room].started){
					Log()('socket', 'game_start');

					Sockets.games[Player.room].started = true;

					setTimeout(function(){
						Log()('socket', 'GAMETIMER');
						Sockets.wss.broadcast(JSON.stringify({ command: 'vote', submissions: Sockets.games[Player.room].currentGuesses }));
					}, Sockets.games[Player.room].timer);

					Log()('socket', 'timer ms: ', Sockets.games[Player.room].timer);

					Sockets.wss.broadcast(JSON.stringify({ command: 'start_timer' }));
				}

				else if(data.command === 'remove_white'){
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

				Sockets.wss.broadcast(JSON.stringify({ command: 'reload_lobby', games: Sockets.games, packs: Object.keys(Cards.packs) }));
			};
		});

		return Sockets;
	}
};

module.exports = Sockets;