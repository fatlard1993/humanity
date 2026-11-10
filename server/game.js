import { Game as BaseGame, refuse } from '@fatlard1993/web-game-framework';
import { simpleId } from '@fatlard1993/web-game-framework/utils';

import { shuffleArray } from '@vanilla-bean/components/utils';

import cards from './cards.js';

export default class Game extends BaseGame {
	// 2: each player's hand moved off the player (whom every page is shown) into `hands`
	static version = 2;
	static migrations = {
		2: save => {
			save.hands = {};

			for (const player of save.players ?? []) {
				save.hands[player.id] = player.cards ?? [];
				delete player.cards;
			}
		},
	};

	constructor(options) {
		super(options);

		// A new game's room: a hand of at least two, from packs there are (a save was checked when it was made)
		if (!options.saveState) {
			const handSize = Number(this.options.handSize ?? 10);
			const packs = Array.isArray(this.options.packs) ? this.options.packs.filter(name => cards.db[name]) : [];

			if (!Number.isInteger(handSize) || handSize < 2 || handSize > 30)
				throw new Error('The hand size is a whole number from 2 to 30');
			if (packs.length === 0) throw new Error('Pick at least one card pack');

			this.options = { ...this.options, handSize, packs };
		}

		this.cards = options.saveState?.cards || cards.buildSuperPack(this.options.packs);
		this.black = options.saveState?.black || this.draw('blacks');
		// Each player's cards, by player id: on their own page alone (viewFor)
		this.hands = options.saveState?.hands || {};
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

	// What anyone is shown (the lobby, a watcher, every player): no one's hand, whether each player has played or voted but
	// not which card, and the cards played this round but not who played them until the votes are in (results)
	toClient() {
		const { players, ...game } = super.toClient();

		return {
			...game,
			players: players.map(player => ({ ...player, selectedCard: !!player.selectedCard })),
			cards: { blacksRemaining: this.cards.blacks.length, whitesRemaining: this.cards.whites.length },
			black: this.black,
			scores: this.scores,
			stage: this.stage,
			submissions: this.submissions.map(({ card }) => card),
			lastRoundScores: this.lastRoundScores,
			lastRoundWinner: this.lastRoundWinner,
			results: this.results(),
		};
	}

	// Once a round is over, who played each card and the votes it took, most first
	results() {
		if (this.stage !== 'end') return [];

		return this.submissions
			.map(({ playerId, card }) => ({ playerId, card, votes: this.lastRoundScores[playerId]?.votes ?? 0 }))
			.sort((a, b) => b.votes - a.votes);
	}

	// A player's page: their own hand, the card they have down this stage, and the cards to vote for without their own
	viewFor(playerId) {
		const view = this.toClient();

		if (!playerId) return view;

		return {
			...view,
			hand: this.hands[playerId] ?? [],
			selected: this.players.get(playerId)?.selectedCard || false,
			submissions: this.submissions.filter(submission => submission.playerId !== playerId).map(({ card }) => card),
		};
	}

	toSaveState() {
		return {
			...super.toSaveState(),
			cards: this.cards,
			hands: this.hands,
			black: this.black,
			scores: this.scores,
			stage: this.stage,
			submissions: this.submissions,
			lastRoundScores: this.lastRoundScores,
			lastRoundWinner: this.lastRoundWinner,
		};
	}

	// A new player waits to ready up, and is dealt a hand (onPlayerAdded)
	createPlayer() {
		return { stage: 'wait', selectedCard: false };
	}

	// What a player can do, from their page: act('ready'), act('play', { card }), act('vote', { card }),
	// act('poke', { targetPlayerId }). Each runs as the page's own player, and every page is sent its view after.
	actions = {
		// Ready for the next round; at the end of one, that's playing again
		ready(player) {
			if (this.stage === 'end') this.updateGameStage('wait');
			else if (player.stage !== 'wait') refuse('Already ready');
			else if (this.stage === 'vote') refuse('The next round starts after this one');

			this.readyUp(player.id);
		},
		play(player, data) {
			const card = data?.card;

			if (this.stage !== 'play' || player.stage !== 'play') refuse('Not the time to play a card');
			if (typeof card !== 'string' || !this.hands[player.id]?.includes(card)) refuse('That card is not in your hand');

			this.selectCard(player.id, card);
		},
		vote(player, data) {
			const card = data?.card;

			if (this.stage !== 'vote' || player.stage !== 'vote') refuse('Not the time to vote');

			const submission = typeof card === 'string' && this.submissions.find(found => found.card === card);

			if (!submission) refuse('That card was not played');
			if (submission.playerId === player.id) refuse('Vote for someone else');

			this.selectCard(player.id, card);
		},
		poke(player, data) {
			const target = typeof data?.targetPlayerId === 'string' && this.players.get(data.targetPlayerId);

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

	onPlayerAdded(player) {
		this.hands[player.id] = this.cards.whites.splice(0, this.options.handSize);
		this.publish();
	}

	// A player who leaves puts their hand back at the bottom of the deck, and the round goes on without them
	onPlayerRemoved(id) {
		this.cards.whites.push(...(this.hands[id] ?? []));
		delete this.hands[id];
		this.advance();
		this.publish();
	}

	// Who's in the round under way: everyone who readied for it. Someone who joined after it began (still waiting) sits
	// it out, unless they ready while cards are still being played.
	inRound() {
		return [...this.players.values()].filter(({ stage }) => stage !== 'wait');
	}

	// The game moves on when everyone it waits for is done: the round starts once all of two or more are ready, and each
	// stage ends once everyone in the round has played or voted. A round down to one player is called off.
	advance() {
		if (this.stage === 'wait') {
			const players = [...this.players.values()];

			if (players.length > 1 && players.every(({ stage }) => stage === 'play')) this.updateGameStage('play');

			return;
		}
		if (this.stage === 'end') return;

		const inRound = this.inRound();

		if (inRound.length < 2) this.updateGameStage('wait');
		else if (inRound.every(({ selectedCard }) => selectedCard))
			this.updateGameStage(this.stage === 'play' ? 'vote' : 'end');
	}

	updateGameStage(stage) {
		if (stage === 'play') {
			this.stage = 'play';
		} else if (stage === 'vote') {
			this.stage = 'vote';
			this.submissions = [];

			this.inRound().forEach(player => {
				this.submissions.push({ playerId: player.id, card: player.selectedCard });
				this.players.set(player.id, { ...player, selectedCard: false });
			});
			// In no one's order, so where a card sits says nothing of who played it
			this.submissions = shuffleArray(this.submissions);
		} else if (stage === 'end') {
			this.stage = 'end';
			this.lastRoundScores = {};

			this.inRound().forEach(player => {
				const vote = this.submissions.find(({ card }) => card === player.selectedCard);

				if (!vote) return;
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

			if (this.scores[this.lastRoundWinner.playerId]) this.scores[this.lastRoundWinner.playerId].wins += 1;
		} else if (stage === 'wait') {
			this.stage = 'wait';
			this.submissions = [];
			this.lastRoundScores = {};
			this.lastRoundWinner = {};
			this.black = this.draw('blacks'); // Draw new black card for next round

			this.players.forEach(player => this.players.set(player.id, { ...player, stage: 'wait', selectedCard: false }));
		}
	}

	// Ready: for the next round, or the one under way while cards are being played
	readyUp(id) {
		this.players.set(id, { ...this.players.get(id), stage: 'play' });
		this.advance();
	}

	// A card played (from the hand, drawing another) or voted for: the stage moves on once everyone has
	selectCard(id, card) {
		const player = this.players.get(id);
		const next = { ...player, selectedCard: card };

		if (player.stage === 'play') {
			const hand = this.hands[id];
			const replacement = this.draw('whites');

			next.stage = 'vote';
			this.hands[id] = replacement
				? hand.map(held => (held === card ? replacement : held))
				: hand.filter(held => held !== card);
		} else next.stage = 'end';

		this.players.set(id, next);

		this.advance();
	}
}
