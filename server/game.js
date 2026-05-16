import { customAlphabet } from 'nanoid';

import BaseGame from '@fatlard1993/web-game-framework/core/Game';

import cards from './cards.js';

// eslint-disable-next-line spellcheck/spell-checker
const simpleId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 5);

export default class Game extends BaseGame {
	constructor(options) {
		// Generate ID before calling super so framework registers with correct ID
		const gameId = options.saveState?.id || simpleId();

		super({ ...options, saveState: { ...options.saveState, id: gameId } });

		// ID is now set by super() constructor

		// Game-specific state
		this.url = this.server?.httpServer?.url || '';
		this.cards = options.saveState?.cards || cards.buildSuperPack(options.packs);
		this.black = options.saveState?.black || this.draw('blacks');
		this.scores = options.saveState?.scores || {};

		this.stage = options.saveState?.stage || 'wait';
		this.submissions = options.saveState?.submissions || [];
		this.lastRoundScores = options.saveState?.lastRoundScores || {};
		this.lastRoundWinner = options.saveState?.lastRoundWinner || {};

		console.log('new Game', { id: this.id, name: this.name, options: this.options });

		// Setup EventRouter event handlers
		this._setupEventHandlers();
	}

	/**
	 * Setup EventRouter event handlers
	 */
	_setupEventHandlers() {
		// Define stage update event
		this.events.defineEvent('game:updateStage', {
			validate: (data) => {
				const validStages = ['play', 'vote', 'end', 'wait'];
				return data.stage && validStages.includes(data.stage);
			},
		});

		this.events.on('game:updateStage', (data) => {
			this.updateGameStage(data.stage);
		});

		// Define player card selection event
		this.events.defineEvent('player:selectCard', {
			validate: (data) => {
				if (!data.playerId || !data.cardId) return false;
				if (!this.players.has(data.playerId)) return false;
				const player = this.players.get(data.playerId);
				// Ensure player has the card
				return player.cards.includes(data.cardId);
			},
		});

		this.events.on('player:selectCard', (data) => {
			this.updatePlayer(data.playerId, { selectedCard: data.cardId });
			this.broadcast('cardSelected', { playerId: data.playerId });
		});

		// Wildcard listener for all game events (logging)
		this.events.on('game:*', (_data, context) => {
			console.log(`[Game Event] ${context.eventName}`, { gameId: this.id, stage: this.stage });
		});

		// Wildcard listener for all player events (logging)
		this.events.on('player:*', (data, context) => {
			console.log(`[Player Event] ${context.eventName}`, { playerId: data.playerId, gameId: this.id });
		});

		console.log('EventRouter configured', {
			gameId: this.id,
			eventCount: this.events.listEvents().length,
		});
	}

	_generateId() {
		return simpleId();
	}

	draw(deck, count = 1) {
		if (this.cards[deck].length === 0) return count > 1 ? [] : undefined;

		const available = Math.min(count, this.cards[deck].length);
		const draw = this.cards[deck].splice(0, available);

		return count > 1 ? draw : draw[0];
	}

	toClient() {
		return {
			...super.toClient(),
			url: this.url,
			cards: { blacksRemaining: this.cards.blacks.length, whitesRemaining: this.cards.whites.length },
			black: this.black,
			scores: this.scores,
			stage: this.stage,
			submissions: this.submissions,
			lastRoundScores: this.lastRoundScores,
			lastRoundWinner: this.lastRoundWinner,
		};
	}

	toSaveState() {
		return {
			...super.toSaveState(),
			cards: this.cards,
			black: this.black,
			scores: this.scores,
			stage: this.stage,
			submissions: this.submissions,
			lastRoundScores: this.lastRoundScores,
			lastRoundWinner: this.lastRoundWinner,
		};
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

		this.broadcast('addPlayer', { newPlayer });

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
			this.black = this.draw('blacks'); // Draw new black card for next round

			this.players.forEach(player => this.players.set(player.id, { ...player, stage: 'wait' }));
		}

		this.broadcast('stageUpdate', { stage });
	}

	updatePlayer(id, updates) {
		const currentPlayer = this.players.get(id);
		const newPlayer = { ...currentPlayer, ...updates };

		if (updates.selectedCard) {
			newPlayer.stage = currentPlayer.stage === 'play' ? 'vote' : 'end';

			if (currentPlayer.stage === 'play') {
				const replacement = this.draw('whites');

				newPlayer.cards = replacement
					? newPlayer.cards.map(card => (card === updates.selectedCard ? replacement : card))
					: newPlayer.cards.filter(card => card !== updates.selectedCard);
			}
		}

		this.players.set(id, newPlayer);

		if (
			this.stage === 'wait' &&
			this.players.size > 1 &&
			updates.stage &&
			[...this.players].every(([, { stage }]) => stage === 'play')
		) {
			console.log('All players ready, starting game');
			this.updateGameStage('play');
		} else if (updates.selectedCard && [...this.players].every(([, { selectedCard }]) => selectedCard)) {
			if (this.stage === 'play') this.updateGameStage('vote');
			else if (this.stage === 'vote') this.updateGameStage('end');
		} else {
			console.log('Broadcasting playerUpdate', { playerId: id, updates });
			this.broadcast('playerUpdate', { playerId: id, updates });
		}

		return this.players.get(id);
	}

	removePlayer(id) {
		this.players.delete(id);

		this.broadcast('removePlayer', { id });

		return id;
	}
}
