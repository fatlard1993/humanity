import { customAlphabet } from 'nanoid';

import { url, socketBroadcast } from './server';
import cards from './cards';

// eslint-disable-next-line spellcheck/spell-checker
const simpleId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

export default class Game {
	constructor({ name, ...options }) {
		this.id = simpleId();
		this.name = name;
		this.options = options;
		this.url = url;
		this.cards = cards.buildSuperPack(options.packs);
		this.black = this.draw('blacks');
		this.players = new Map();
		this.scores = {};

		this.stage = 'wait';
		this.submissions = [];
		this.lastRoundScores = {};
		this.lastRoundWinner = {};

		console.log('new Game', { id: this.id, name, options });
	}

	draw(deck, count = 1) {
		const draw = this.cards[deck].splice(0, count);

		return count > 1 ? draw : draw[0];
	}

	toClient() {
		return { ...this, players: [...this.players.values()] };
	}

	addPlayer(name) {
		const id = simpleId();
		const newPlayer = {
			id,
			name,
			cards: this.draw('whites', this.options.handSize),
			stage: 'wait',
			selectedCard: false,
		};

		this.players.set(id, newPlayer);

		socketBroadcast({ gameId: this.id });

		return newPlayer;
	}

	updateGameStage(stage) {
		console.log('updateGameStage', stage);
		if (stage === 'play') {
			this.stage = 'play';
		} else if (stage === 'vote') {
			this.stage = 'vote';
			this.submissions = [];

			this.players.forEach(player => {
				this.submissions.push({ playerId: player.id, card: player.selectedCard });
				this.players.set(player.id, { ...player, selectedCard: false });
			});
		} else if (stage === 'end') {
			this.stage = 'end';
			this.lastRoundScores = {};

			this.players.forEach(player => {
				const vote = this.submissions.find(({ card }) => card === player.selectedCard);

				if (!this.scores[vote.playerId]) this.scores[vote.playerId] = { votes: 0, wins: 0 };
				if (!this.lastRoundScores[vote.playerId]) this.lastRoundScores[vote.playerId] = { votes: 0, card: vote.card };

				this.scores[vote.playerId].votes += 1;
				this.lastRoundScores[vote.playerId].votes += 1;

				this.players.set(player.id, { ...player, selectedCard: false });
			});

			let mostVotes = 0;

			Object.entries(this.lastRoundScores).forEach(([playerId, { votes, card }]) => {
				if (votes > mostVotes) {
					mostVotes = votes;
					this.lastRoundWinner = { playerId, card, votes };
				}
			});

			this.scores[this.lastRoundWinner.playerId].wins += 1;
		} else if (stage === 'wait') {
			this.stage = 'wait';
			this.submissions = [];
			this.lastRoundScores = {};
			this.lastRoundWinner = {};

			this.players.forEach(player => this.players.set(player.id, { ...player, stage: 'wait' }));
		}

		socketBroadcast({ gameId: this.id });
	}

	updatePlayer(id, updates) {
		const currentPlayer = this.players.get(id);
		const newPlayer = { ...currentPlayer, ...updates };

		if (updates.selectedCard) {
			newPlayer.stage = currentPlayer.stage === 'play' ? 'vote' : 'end';

			if (currentPlayer.stage === 'play')
				newPlayer.cards = newPlayer.cards.map(card => (card === updates.selectedCard ? this.draw('whites') : card));
		}

		this.players.set(id, newPlayer);

		if (
			this.stage === 'wait' &&
			this.players.size > 1 &&
			updates.stage &&
			[...this.players].every(([, { stage }]) => stage === 'play')
		)
			this.updateGameStage('play');
		else if (updates.selectedCard && [...this.players].every(([, { selectedCard }]) => selectedCard)) {
			if (this.stage === 'play') this.updateGameStage('vote');
			else if (this.stage === 'vote') this.updateGameStage('end');
		} else socketBroadcast({ gameId: this.id });

		return this.players.get(id);
	}

	removePlayer(id) {
		this.players.delete(id);

		socketBroadcast({ gameId: this.id });

		return id;
	}
}
