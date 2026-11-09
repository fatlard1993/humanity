import { Game as BaseGame, refuse } from '@fatlard1993/web-game-framework';
import { simpleId } from '@fatlard1993/web-game-framework/utils';

import cards from './cards.js';

export default class Game extends BaseGame {
	constructor(options) {
		super(options);

		// Game-specific state
		this.url = this.server.url;
		this.cards = options.saveState?.cards || cards.buildSuperPack(options.packs);
		this.black = options.saveState?.black || this.draw('blacks');
		this.scores = options.saveState?.scores || {};

		this.stage = options.saveState?.stage || 'wait';
		this.submissions = options.saveState?.submissions || [];
		this.lastRoundScores = options.saveState?.lastRoundScores || {};
		this.lastRoundWinner = options.saveState?.lastRoundWinner || {};
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

	// What a new player starts with: a hand, and waiting to ready up
	createPlayer() {
		return { cards: this.draw('whites', this.options.handSize), stage: 'wait', selectedCard: false };
	}

	// What a player can do, from their page: act('ready'), act('play', { card }), act('vote', { card }),
	// act('poke', { targetPlayerId }). Each runs as the page's own player, and every page is sent its view after.
	actions = {
		// Ready for the next round; at the end of one, that's playing again
		ready(player) {
			if (this.stage === 'end') this.updateGameStage('wait');
			else if (player.stage !== 'wait') refuse('Already ready');

			this.readyUp(player.id);
		},
		play(player, { card } = {}) {
			if (this.stage !== 'play' || player.stage !== 'play') refuse('Not the time to play a card');
			if (typeof card !== 'string' || !player.cards.includes(card)) refuse('That card is not in your hand');

			this.selectCard(player.id, card);
		},
		vote(player, { card } = {}) {
			if (this.stage !== 'vote' || player.stage !== 'vote') refuse('Not the time to vote');

			const submission = typeof card === 'string' && this.submissions.find(found => found.card === card);

			if (!submission) refuse('That card was not played');
			if (submission.playerId === player.id) refuse('Vote for someone else');

			this.selectCard(player.id, card);
		},
		poke(player, { targetPlayerId } = {}) {
			const target = this.players.get(targetPlayerId);

			if (!target) refuse('No such player');
			if (target.id === player.id) refuse('Poke someone else');

			this.broadcast('poke', { targetPlayerId: target.id, targetPlayerName: target.name });
		},
	};

	// Joining again as who they were (Play Again from an old page) starts the next round if this one is over, and readies
	// them for it
	onPlayerRejoined(player) {
		if (this.stage === 'end') this.updateGameStage('wait');

		this.readyUp(player.id);
		this.publish();
	}

	onPlayerAdded() {
		this.publish();
	}

	onPlayerRemoved() {
		this.publish();
	}

	updateGameStage(stage) {
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
	}

	// Ready: the round starts once everyone is, with two or more
	readyUp(id) {
		this.players.set(id, { ...this.players.get(id), stage: 'play' });

		if (
			this.stage === 'wait' &&
			this.players.size > 1 &&
			[...this.players.values()].every(({ stage }) => stage === 'play')
		)
			this.updateGameStage('play');
	}

	// A card played (from the hand, drawing another) or voted for: the stage moves on once everyone has
	selectCard(id, card) {
		const player = this.players.get(id);
		const next = { ...player, selectedCard: card };

		if (player.stage === 'play') {
			const replacement = this.draw('whites');

			next.stage = 'vote';
			next.cards = replacement
				? player.cards.map(held => (held === card ? replacement : held))
				: player.cards.filter(held => held !== card);
		} else next.stage = 'end';

		this.players.set(id, next);

		if ([...this.players.values()].every(({ selectedCard }) => selectedCard)) {
			if (this.stage === 'play') this.updateGameStage('vote');
			else if (this.stage === 'vote') this.updateGameStage('end');
		}
	}
}
