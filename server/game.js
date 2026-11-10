import { Game as BaseGame, refuse } from '@fatlard1993/web-game-framework';
import { simpleId } from '@fatlard1993/web-game-framework/utils';

import { shuffleArray } from '@vanilla-bean/components/utils';

import { editProblem } from '../rules/edit.js';
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

		// A new game's room: a hand of at least two, from packs there are with cards of both colors between them (a save
		// was checked when it was made)
		if (!options.saveState) {
			const handSize = Number(this.options.handSize ?? 10);
			const packs = Array.isArray(this.options.packs) ? this.options.packs.filter(name => cards.db[name]) : [];

			if (!Number.isInteger(handSize) || handSize < 2 || handSize > 30)
				throw new Error('The hand size is a whole number from 2 to 30');
			if (packs.length === 0) throw new Error('Pick at least one card pack');
			// Whites alone (or blacks alone) can't be played: there'd be no question, or nothing to answer it with
			if (!['blacks', 'whites'].every(deck => packs.some(name => cards.db[name].data[deck]?.length > 0)))
				throw new Error('These packs need both black and white cards');

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
		// A tied vote's tiebreak, from the tie to the round's end: who tied, their moves, and the vote that settles it
		this.tiebreak = options.saveState?.tiebreak || null;
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
			submissions: this.votable().map(({ card }) => card),
			// Whose card took which votes is part of who played what: said at the round's end, not through a tiebreak
			lastRoundScores: this.stage === 'end' ? this.lastRoundScores : {},
			lastRoundWinner: this.lastRoundWinner,
			results: this.results(),
			tiebreak: this.tiebreakView(),
		};
	}

	// The cards up for a vote: everything played, or in a tiebreak only the cards that tied
	votable() {
		const tied = this.tiebreak?.players;

		return tied ? this.submissions.filter(({ playerId }) => tied.includes(playerId)) : this.submissions;
	}

	// What everyone sees of a tiebreak: who tied, who it waits on, and each one's move once all have chosen (not before,
	// so no one chooses knowing the other's choice)
	tiebreakView() {
		const tiebreak = this.tiebreak;

		if (!tiebreak) return null;

		const { players, phase, choices } = tiebreak;

		return {
			players,
			phase,
			waiting: this.tiebreakWaiting(),
			...(phase !== 'choose' && {
				moves: Object.fromEntries(players.map(id => [id, choices[id]?.move])),
				targets: Object.fromEntries(players.map(id => [id, this.opponentOf(id)])),
			}),
		};
	}

	// Once a round is over, who played each card and the votes it took, most first
	results() {
		if (this.stage !== 'end') return [];

		const tiebreak = this.tiebreak;

		return this.submissions
			.map(({ playerId, card, original, editedBy }) => ({
				playerId,
				card,
				votes: this.lastRoundScores[playerId]?.votes ?? 0,
				// Rewritten in a tiebreak: what it said before, and who changed it
				...(original && { original, editedBy }),
				...(tiebreak?.players.includes(playerId) && { tiebreakVotes: tiebreak.votes?.[playerId] ?? 0 }),
			}))
			.sort((a, b) => b.votes - a.votes || (b.tiebreakVotes ?? 0) - (a.tiebreakVotes ?? 0));
	}

	// A player's page: their own hand, the card they have down this stage, and the cards to vote for without their own
	viewFor(playerId) {
		const view = this.toClient();

		if (!playerId) return view;

		return {
			...view,
			hand: this.hands[playerId] ?? [],
			selected: this.players.get(playerId)?.selectedCard || false,
			submissions: this.votable()
				.filter(submission => submission.playerId !== playerId)
				.map(({ card }) => card),
			duel: this.duelFor(playerId),
		};
	}

	// A tied player's side of the tiebreak: their card, their opponent's as it stands, and the move they've made
	duelFor(playerId) {
		if (this.stage !== 'tiebreak' || !this.tiebreak.players.includes(playerId)) return null;

		const cardOf = id => this.submissions.find(submission => submission.playerId === id)?.card;
		const opponent = this.opponentOf(playerId);

		return {
			mine: cardOf(playerId),
			opponent,
			theirs: cardOf(opponent),
			move: this.tiebreak.choices[playerId]?.move ?? null,
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
			tiebreak: this.tiebreak,
		};
	}

	// A new player waits to ready up, and is dealt a hand (onPlayerAdded)
	createPlayer() {
		return { stage: 'wait', selectedCard: false };
	}

	// What a player can do, from their page: act('ready'), act('play', { card }), act('vote', { card }),
	// act('tiebreak', { move } or { text }), act('poke', { targetPlayerId }). Each runs as the page's own player, and
	// every page is sent its view after.
	actions = {
		// Ready for the next round; at the end of one, that's playing again
		ready(player) {
			if (this.stage === 'end') this.updateGameStage('wait');
			else if (player.stage !== 'wait') refuse('Already ready');
			else if (this.stage === 'vote' || this.stage === 'tiebreak') refuse('The next round starts after this one');

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

			const submission = typeof card === 'string' && this.votable().find(found => found.card === card);

			if (!submission) refuse('That card was not played');
			if (submission.playerId === player.id) refuse('Vote for someone else');

			this.selectCard(player.id, card);
		},
		// A tied player's move. First each chooses: { move: 'edit' } to rewrite their opponent's card, or
		// { move: 'repick', card } to swap their own for one from their hand. Then, the swaps made, whoever chose to
		// rewrite sends { text }: their opponent's card with up to three characters changed.
		tiebreak(player, data) {
			const tiebreak = this.tiebreak;

			if (this.stage !== 'tiebreak' || !tiebreak.players.includes(player.id)) refuse('This tiebreak is not yours');
			if (!this.tiebreakWaiting().includes(player.id)) refuse('Your move is made');

			if (tiebreak.phase === 'choose') {
				if (data?.move === 'edit') tiebreak.choices[player.id] = { move: 'edit' };
				else if (data?.move === 'repick') {
					if (typeof data.card !== 'string' || !this.hands[player.id]?.includes(data.card))
						refuse('That card is not in your hand');

					this.takeFromHand(player.id, data.card);
					tiebreak.choices[player.id] = { move: 'repick', card: data.card };
				} else refuse('Rewrite their card or swap yours');
			} else {
				const target = this.submissions.find(({ playerId }) => playerId === this.opponentOf(player.id));
				const problem = editProblem(target.card, data?.text);

				if (problem) refuse(problem);

				tiebreak.edits[player.id] = data.text;
			}

			this.advance();
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
		else if (this.stage === 'tiebreak') this.advanceTiebreak();
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
			this.settleVote();
		} else if (stage === 'wait') {
			this.stage = 'wait';
			this.submissions = [];
			this.lastRoundScores = {};
			this.lastRoundWinner = {};
			this.tiebreak = null;
			this.black = this.draw('blacks'); // Draw new black card for next round

			this.players.forEach(player => this.players.set(player.id, { ...player, stage: 'wait', selectedCard: false }));
		}
	}

	// The votes are in. Whoever took the most wins the round; a tie for the most goes to a tiebreak between the tied,
	// once, and a tiebreak's vote that ties again shares the win. With two players each can only vote for the other, so
	// their tie is shared at once.
	settleVote() {
		const votes = {};

		this.inRound().forEach(player => {
			const vote = this.votable().find(({ card }) => card === player.selectedCard);

			if (vote) votes[vote.playerId] = (votes[vote.playerId] ?? 0) + 1;

			this.players.set(player.id, { ...player, selectedCard: false });
		});

		const most = Math.max(0, ...Object.values(votes));
		// In the order they sat down, not the order the votes came in
		const seats = [...this.players.keys()];
		const leaders = Object.keys(votes)
			.filter(id => votes[id] === most)
			.sort((a, b) => seats.indexOf(a) - seats.indexOf(b));

		if (this.tiebreak) this.tiebreak.votes = votes;
		else {
			this.lastRoundScores = {};

			Object.entries(votes).forEach(([playerId, count]) => {
				const { card } = this.submissions.find(submission => submission.playerId === playerId);

				this.lastRoundScores[playerId] = { votes: count, card };
			});

			// Someone tied who has since left has no move to make: the tiebreak is between those still here
			const tied = leaders.filter(id => this.players.has(id));

			if (tied.length > 1 && this.inRound().length > 2) {
				this.stage = 'tiebreak';
				this.tiebreak = { players: tied, phase: 'choose', choices: {}, edits: {} };

				return;
			}
		}

		this.endRound(leaders);
	}

	// The round goes to whoever led the vote: one winner, or a win each for those still tied after a tiebreak
	endRound(winners) {
		this.stage = 'end';

		// The votes each card took count toward its player's total now, not while a tiebreak could still be read from them
		Object.entries(this.lastRoundScores).forEach(([playerId, { votes }]) => {
			this.scores[playerId] ??= { votes: 0, wins: 0 };
			this.scores[playerId].votes += votes;
		});

		winners.forEach(playerId => {
			this.scores[playerId] ??= { votes: 0, wins: 0 };
			this.scores[playerId].wins += 1;
		});

		if (winners.length === 0) return;

		const [playerId] = winners;

		this.lastRoundWinner = {
			playerId,
			card: this.submissions.find(submission => submission.playerId === playerId)?.card,
			votes: this.lastRoundScores[playerId]?.votes ?? 0,
			...(winners.length > 1 && { shared: winners }),
		};
	}

	// Whose card a tied player may rewrite: the other one, or with more than two tied the next around, so each card has
	// one player who can change it
	opponentOf(playerId) {
		const { players } = this.tiebreak;

		return players[(players.indexOf(playerId) + 1) % players.length];
	}

	// Who a tiebreak is waiting on: everyone tied until they choose, then whoever chose to rewrite until they have
	tiebreakWaiting() {
		const { players, phase, choices, edits } = this.tiebreak;

		if (phase === 'choose') return players.filter(id => !choices[id]);
		if (phase === 'edit') return players.filter(id => choices[id]?.move === 'edit' && edits[id] === undefined);

		return [];
	}

	// A tiebreak moves on when no one tied has a move left to make: from choosing to rewriting (the swaps made first, so
	// a rewrite is of the card its player ends up with), then to everyone voting again on the tied cards alone. Someone
	// tied who has left is out of it, and with one left there is no tie.
	advanceTiebreak() {
		const tiebreak = this.tiebreak;
		const submissionOf = id => this.submissions.find(submission => submission.playerId === id);

		tiebreak.players = tiebreak.players.filter(id => this.players.has(id));

		if (tiebreak.players.length < 2) {
			this.endRound(tiebreak.players);

			return;
		}
		if (this.tiebreakWaiting().length > 0) return;

		if (tiebreak.phase === 'choose') {
			tiebreak.players.forEach(id => {
				const { move, card } = tiebreak.choices[id];

				if (move === 'repick') Object.assign(submissionOf(id), { card, swapped: true });
			});
			tiebreak.phase = 'edit';

			if (this.tiebreakWaiting().length > 0) return;
		}

		tiebreak.players.forEach(id => {
			const target = submissionOf(this.opponentOf(id));
			const text = tiebreak.edits[id];

			if (text !== undefined && text !== target.card)
				Object.assign(target, { original: target.card, card: text, editedBy: id });
		});

		tiebreak.phase = 'vote';
		this.stage = 'vote';
		this.inRound().forEach(player => this.players.set(player.id, { ...player, stage: 'vote', selectedCard: false }));
	}

	// A card leaves a hand, and another is drawn in its place while the deck has one
	takeFromHand(id, card) {
		const replacement = this.draw('whites');

		this.hands[id] = replacement
			? this.hands[id].map(held => (held === card ? replacement : held))
			: this.hands[id].filter(held => held !== card);
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
			next.stage = 'vote';
			this.takeFromHand(id, card);
		} else next.stage = 'end';

		this.players.set(id, next);

		this.advance();
	}
}
