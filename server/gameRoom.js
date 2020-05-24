const log = require('log');
const util = require('js-util');
const Room = require('byod-game-engine/server/room');

// score feature todo:
// number of rounds
// individual player score
// round ties & game ties
// game end score display

class GameRoom extends Room {
	constructor(options, game){
		super(options, game);

		if(!options.packs.length) options.packs = ['base'];

		this.cards = game.cards.get(this.options.packs);

		this.initialize();

		return this;
	}

	initialize(){
		this.state = {
			stage: 'new',
			round: 0,
			votes: {}
		};

		this.drawBlack();

		for(var player, x = this.playerNames.length - 1; x >= 0; --x){
			player = this.players[this.playerNames[x]];

			if(player.submission) delete this.players[this.playerNames[x]].submission;
			if(player.vote) delete this.players[this.playerNames[x]].vote;
		}
	}

	addPlayer(player){
		super.addPlayer({
			name: player.name,
			state: player.state,
			type: player.type,
			hand: player.type === 'play' ? this.drawWhites(this.options.whiteCardCount) : [],
			socket: player
		});

		this.sendUpdate();
	}

	removePlayer(player){
		super.removePlayer(player);

		this.sendUpdate();
	}

	drawBlack(){
		var totalBlacks = this.cards.blacks.length;

		if(!totalBlacks){
			this.cards.blacks = this.game.cards.get(this.options.packs).blacks;

			totalBlacks = this.cards.blacks.length;
		}

		var randBlack = util.randInt(0, totalBlacks);

		if(this.game.cards.blacklist[this.cards.blacks[randBlack]]){
			this.cards.blacks.splice(randBlack, 1);

			return this.drawBlack();
		}

		this.state.black = this.cards.blacks[randBlack];

		this.cards.blacks.splice(randBlack, 1);
	}

	drawWhites(count){
		if(count === 1){
			var totalWhites = this.cards.whites.length;

			if(!totalWhites){
				this.cards.whites = this.game.cards.get(this.options.packs).whites;

				totalWhites = this.cards.whites.length;
			}

			var randWhite = util.randInt(0, totalWhites);
			var newWhite = this.cards.whites[randWhite];

			this.cards.whites.splice(randWhite, 1);

			log('card', newWhite);

			return newWhite;
		}

		for(var x = 0, cards = []; x < count; ++x) cards.push(this.drawWhites(1));

		log('cards', cards);

		return cards;
	}

	newNpcName(){
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

		if(name) return name;

		for(x = 0; x < totalBlacks; ++x){
			if(/^[^\s]+$/.test(this.cards.blacks[x])){
				name = this.cards.blacks[x];

				this.cards.blacks.splice(x, 1);
			}
		}

		return name || 'NPC';
	}

	updateWaitingOn(){
		for(var player, waitingOn = [], x = this.playerNames.length - 1; x >= 0; --x){
			player = this.players[this.playerNames[x]];

			if(player.type === 'play' && !{ inactive: 1, done: 1 }[player.state]) waitingOn.push(player.name);
		}

		this.state.waitingOnCount = waitingOn.length;
		this.state.waitingOn = this.state.waitingOnCount && waitingOn;
	}

	sendUpdate(){
		var update = Object.assign({}, this.state, {
			playerNames: this.playerNames,
			playerCount: this.playerCount,
			submissions: {},
			votes: {},
			players: {},
			activePlayers: 0,
			vetoVotes: 0
		});

		for(var player, x = this.playerCount - 1; x >= 0; --x){
			player = this.players[this.playerNames[x]];

			if(player.type === 'view') continue;

			if(player.state === 'veto') ++update.vetoVotes;

			if(player.state !== 'inactive') ++update.activePlayers;

			if(player.submission) update.submissions[player.submission] = player.name;

			if(player.vote){
				update.votes[player.vote] = update.votes[player.vote] || 0;

				++update.votes[player.vote];
			}

			update.players[player.name] = {
				name: player.name,
				type: player.type,
				state: player.state
			};
		}

		if(update.vetoVotes && update.vetoVotes === update.activePlayers){
			this.drawBlack();

			log(`Vetoed "${this.state.black}"`);

			this.game.cards.recordBlacklist(this.state.black);

			return this.changeStage('submissions');
		}

		this.state.submissions = update.submissions;
		this.state.activePlayers = update.activePlayers;
		this.state.votes = update.votes;

		log(1)('game_update', update);

		this.broadcast('game_update', update);
	}

	checkState(){
		this.updateWaitingOn();

		if(this.state.waitingOnCount){// !(this.options.lastManOut && { submissions: 1, voting: 1 }[this.state.stage] && this.state.waitingOnCount - 1 <= 0)
			log('[GameRoom] Waiting on', this.state.waitingOn);

			this.sendUpdate();
		}

		else if(this.state.stage === 'new' && this.state.activePlayers > 2) this.changeStage('submissions');

		else if(this.state.stage === 'submissions') this.changeStage('voting');

		else if(this.state.stage === 'voting') this.changeStage('end');
	}

	changeStage(stage){
		if(this.state.activePlayers < 3) stage = 'new';

		this.state.stage = stage;

		for(var player, x = this.playerCount - 1; x >= 0; --x){
			if(this.players[this.playerNames[x]].state !== 'inactive') this.players[this.playerNames[x]].state = stage;

			player = this.players[this.playerNames[x]];

			this.broadcast('player_update', {
				name: player.name,
				state: player.state,
				hand: player.hand
			});
		}

		if(stage === 'new'){
			this.initialize();
		}

		else if(stage === 'submissions'){
			if(this.options.npcCount){
				for(x = 0; x < this.options.npcCount; ++x){
					this.submissions.push({ player: this.newNpcName(), submission: this.drawWhites(1) });
				}
			}
			if(this.options.fillInMissing && this.state.waitingOnCount){
				for(x = 0; x < this.state.waitingOnCount; ++x){
					this.submissions.push({ player: this.newNpcName(), submission: this.drawWhites(1) });
				}
			}

			if(this.options.submissionTimer){
				log('Enabling submission timer for: ', this.options.submissionTimer);

				setTimeout(() => {
					if(this.state.stage === 'submissions') this.changeStage('voting');
				}, (this.options.submissionTimer + 5) * 1000);
			}
		}

		else if(stage === 'voting'){
			var npcSubmissions = 0;

			if(this.options.npcCount) npcSubmissions += this.options.npcCount;

			if(this.options.fillInMissing && this.state.waitingOn) npcSubmissions += this.state.waitingOnCount;

			for(x = 0; x < npcSubmissions; ++x) this.submissions.push({ player: this.newNpcName(), submission: this.drawWhites(1) });

			if(this.options.voteTimer){
				log('Enabling vote timer for: ', this.options.voteTimer);

				setTimeout(() => {
					if(this.state.stage === 'voting') this.changeStage('end');
				}, (this.options.voteTimer + 5) * 1000);
			}
		}

		else if(stage === 'end'){
			var winner = { votes: 0 }, voteEntries = Object.keys(this.state.votes), votedEntryCount = voteEntries.length;

			for(x = 0; x < votedEntryCount; ++x){
				if(this.state.votes[voteEntries[x]] > winner.votes) winner = { player: this.state.submissions[voteEntries[x]], submission: voteEntries[x], votes: this.state.votes[voteEntries[x]] };
			}

			this.state.winner = winner;
			this.state.scores = this.state.scores || {};
			this.state.scores[winner] = this.state.scores[winner] || 0;
			++this.state.scores[winner];

			++this.state.round;

			// var mostVotesOnSingleSubmission = 0, votedEntryNames = Object.keys(this.currentVotes), votedEntryCount = votedEntryNames.length;

			// for(x = 0; x < votedEntryCount; ++x){
			// 	if(this.currentVotes[votedEntryNames[x]].count > mostVotesOnSingleSubmission) mostVotesOnSingleSubmission = this.currentVotes[votedEntryNames[x]].count;
			// }

			// for(x = 0; x < votedEntryCount; ++x){
			// 	if(this.currentVotes[votedEntryNames[x]].count && this.currentVotes[votedEntryNames[x]].count > 0){
			// 		if(!this.scores[this.currentVotes[votedEntryNames[x]].player]) this.scores[this.currentVotes[votedEntryNames[x]].player] = { votes: 0, winningVotes: 0, wins: 0, points: 0 };

			// 		var newVotes = this.currentVotes[votedEntryNames[x]].count;

			// 		if(newVotes === mostVotesOnSingleSubmission){
			// 			this.currentVotes[votedEntryNames[x]].winner = true;

			// 			++this.scores[this.currentVotes[votedEntryNames[x]].player].wins;
			// 			this.scores[this.currentVotes[votedEntryNames[x]].player].winningVotes += newVotes;
			// 		}

			// 		this.scores[this.currentVotes[votedEntryNames[x]].player].votes += newVotes;

			// 		var newWins = this.currentVotes[votedEntryNames[x]].winner ? 1 : 0;
			// 		var mod = (newWins + 1 + (newWins ? (this.players.length - votedEntryCount) + (votedEntryCount === 2 ? 1 : 0) : 0));

			// 		this.scores[this.currentVotes[votedEntryNames[x]].player].points += newVotes * mod;

			// 		log(`${this.currentVotes[votedEntryNames[x]].player} got ${newVotes * mod} points with a modifier of: ${mod}`);
			// 	}
			// }

			// log('player_vote_results', this.currentVotes);

			// var scorePlayerNames = Object.keys(this.scores), scorePlayerCount = scorePlayerNames.length;
			// var gameWinner;

			// for(x = 0; x < scorePlayerCount; ++x){
			// 	if(this.options.winGoal && this.scores[scorePlayerNames[x]].wins >= this.options.winGoal) gameWinner = scorePlayerNames[x];
			// 	if(this.options.pointGoal && this.scores[scorePlayerNames[x]].points >= this.options.pointGoal) gameWinner = scorePlayerNames[x];
			// }
		}

		this.sendUpdate();
	}
}

module.exports = GameRoom;