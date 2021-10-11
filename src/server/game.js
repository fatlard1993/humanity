const util = require('js-util');
const log = new (require('log'))({ tag: 'game' });

const Room = require('./room');
const humanity = require('./humanity');
const cards = require('./cards');
const { sendError } = require('./sockets');

class Game extends Room {
	constructor(options) {
		super(options);

		if (!options?.packs?.length) options.packs = ['base'];

		this.cards = cards.getPacks(this.options.packs);

		this.initialize();
	}

	initialize() {
		this.state = {
			stage: 'new',
			round: 0,
			votes: {},
		};

		this.drawBlack();

		this.playerIds.forEach(id => {
			const player = this.players[id];

			if (player.state.submission) delete this.players[id].state.submission;
			if (player.state.vote) delete this.players[id].state.vote;
		});
	}

	registerPlayer({ name, type, socket }) {
		const existingPlayer = name && this.getPlayerByName(name);

		if (existingPlayer?.type === type) {
			if (existingPlayer.state.status !== 'inactive') {
				return sendError(socket, 'register', 'A player by that name is already playing in this room');
			}

			const id = existingPlayer.id;

			this.players[id] = { ...existingPlayer, socket };

			this.players[id].state.status = 'inactive';

			socket.reply('register', { type, name, id });
		} else {
			const { id } = super.addPlayer({
				name,
				type,
				socket,
				state: {
					status: 'inactive',
					hand: type === 'play' ? this.drawWhites(this.options.handSize) : [],
					score: 0,
				},
			});

			socket.reply('register', { type, name, id });
		}

		// this.sendUpdate();

		humanity.rooms.lobby.sendUpdate();
	}

	removePlayer(id) {
		if (!id || !this.players[id]) return;

		log(`[room - ${this.name}] Player "${id}" leaving`);

		this.players[id].state.status = 'inactive';

		this.sendUpdate();
	}

	playerJoin({ id, socket }) {
		if (!this.players[id]) return sendError(socket, 'join', 'Your player is not registered for this room');
		if (this.players[id].state.status !== 'inactive') return sendError(socket, 'join', 'A player by that name is already playing in this room');

		this.players[id].socket = socket;
		this.players[id].state.status = 'joined';

		socket.reply('join', { options: this.options });
		socket.reply('player_update', { state: this.players[id].state });

		if (this.state.stage === 'end') this.changeStage('new');
		else this.sendUpdate();
	}

	drawBlack() {
		let totalBlacks = this.cards.blacks.size;

		if (!totalBlacks) {
			// Reshuffle the black cards
			this.cards.blacks = cards.getPacks(this.options.packs).blacks;

			totalBlacks = this.cards.blacks.size;
		}

		const randBlack = util.randInt(0, totalBlacks);

		// if (humanity.cards.blacklist[this.cards.blacks[randBlack]]) {
		// 	this.cards.blacks.splice(randBlack, 1);

		// 	return this.drawBlack();
		// }

		this.state.black = [...this.cards.blacks][randBlack];

		this.cards.blacks.delete(this.state.black);
	}

	drawWhites(count) {
		if (count === 1) {
			let totalWhites = this.cards.whites.size;

			if (!totalWhites) {
				// Reshuffle the white cards
				this.cards.whites = cards.getPacks(this.options.packs).whites;

				totalWhites = this.cards.whites.size;
			}

			const randWhite = util.randInt(0, totalWhites);
			const newWhite = [...this.cards.whites][randWhite];

			this.cards.whites.delete(newWhite);

			log('draw card', newWhite);

			return newWhite;
		}

		const draw = [];

		for (let x = 0; x < count; ++x) draw.push(this.drawWhites(1));

		log('draw', count, draw);

		return draw;
	}

	updateWaitingOn() {
		const waitingOn = [];

		this.playerIds.forEach(id => {
			const player = this.players[id];

			if (player.type === 'play' && !{ inactive: 1, done: 1 }[player.state.status]) waitingOn.push(player.name);
		});

		this.state.waitingOnCount = waitingOn.length;
		this.state.waitingOn = this.state.waitingOnCount && waitingOn;
	}

	sendUpdate() {
		const update = Object.assign({}, this.state, {
			playerIds: this.playerIds,
			playerCount: this.playerCount,
			submissions: {},
			votes: {},
			players: {},
			activePlayers: 0,
			vetoVotes: 0,
		});

		this.playerIds.forEach(id => {
			const { name, type, state } = this.players[id];
			const { status, submission, vote } = state;

			if (type === 'view') return;

			if (status === 'veto') ++update.vetoVotes;

			if (status !== 'inactive') ++update.activePlayers;

			if (submission) update.submissions[submission] = id;

			if (vote) {
				update.votes[vote] = update.votes[vote] || 0;

				++update.votes[vote];
			}

			update.players[id] = {
				name,
				id,
				type,
				state,
			};
		});

		if (update.vetoVotes && update.vetoVotes === update.activePlayers) {
			log(`Vetoed "${this.state.black}"`);

			cards.remove(this.options.packs, 'black', this.state.black);

			this.drawBlack();

			return this.changeStage('submissions');
		}

		this.state.submissions = update.submissions;
		this.state.activePlayers = update.activePlayers;
		this.state.votes = update.votes;

		log(1)('game_update', update);

		this.broadcast('game_update', update);
	}

	checkState() {
		this.updateWaitingOn();

		if (this.state.waitingOnCount) {
			log('[GameRoom] Waiting on', this.state.waitingOn);

			this.sendUpdate();
		} else if (this.state.stage === 'new' && this.state.activePlayers > 2) this.changeStage('submissions');
		else if (this.state.stage === 'submissions') this.changeStage('voting');
		else if (this.state.stage === 'voting') this.changeStage('end');
	}

	getWinners() {
		const { votes } = this.state;
		let winners = {};
		let topScore = 0;

		log.error('tp01', votes);

		Object.keys(votes).forEach(card => {
			const voteCount = votes[card];

			if (voteCount > topScore) {
				topScore = voteCount;
				winners = { [card]: voteCount };

				return;
			}

			if (voteCount === topScore) winners[card] = voteCount;
		});

		return winners;
	}

	updatePlayer({ id, update }) {
		log('player update', this.name, update);

		const { socket, state } = this.players[id];

		if (update.submission) {
			if (this.state.submissions[update.submission]) {
				return sendError(socket, 'player_submission', 'That card has already been submitted');
			}

			if (state.hand.includes(update.submission)) this.players[id].state.hand[state.hand.indexOf(update.submission)] = this.drawWhites(1);
		}
		// else if (payload.trash) {
		// 	for (var x = 0, count = payload.trash.length; x < count; ++x) {
		// 		this.players[id].state.hand[hand.indexOf(payload.trash[x])] = this.drawWhites(1);

		// 		this.players[id].state.hand.push(this.drawWhites(1));
		// 	}

		// 	socket.reply('player_update', { state });
		// }

		this.players[id].state = Object.assign(state, update);

		socket.reply('player_update', { state });

		this.sendUpdate();
		this.checkState();
	}

	changeStage(stage) {
		if (this.state.activePlayers < 3) stage = 'new';

		this.state.stage = stage;

		this.playerIds.forEach(id => {
			const { state, socket } = this.players[id];

			if (state.status !== 'inactive') state.status = stage;

			socket.reply('player_update', { state });
		});

		if (stage === 'new') {
			this.initialize();
		} else if (stage === 'submissions') {
			if (this.options.submissionTimer) {
				log('Enabling submission timer for: ', this.options.submissionTimer);

				setTimeout(() => {
					if (this.state.stage === 'submissions') this.changeStage('voting');
				}, (this.options.submissionTimer + 5) * 1000);
			}
		} else if (stage === 'voting') {
			if (this.options.voteTimer) {
				log('Enabling vote timer for: ', this.options.voteTimer);

				setTimeout(() => {
					if (this.state.stage === 'voting') this.changeStage('end');
				}, (this.options.voteTimer + 5) * 1000);
			}
		} else if (stage === 'end') {
			const { winGoal } = this.options;
			const { submissions, votes } = this.state;
			const { players } = this;

			const winningCards = this.getWinners();
			const winners = Object.keys(winningCards).map(cardText => ({
				player: submissions[cardText],
				submission: cardText,
				votes: votes[cardText],
			}));

			this.state.winners = winners;

			winners.forEach(winner => {
				++this.players[winner.player].state.score;
			});

			winners.forEach(winner => {
				if (players[winner.player].state.score >= winGoal) {
					this.state.gameOver = true;
				}
			});

			++this.state.round;
		}

		this.sendUpdate();
	}
}

module.exports = Game;
