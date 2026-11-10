import { expect, test } from 'bun:test';

import cards from './cards.js';
import Game from './game.js';

cards.init();

const quiet = { info() {}, debug() {}, warning() {}, error() {} };
const newGame = () =>
	new Game({
		server: { games: {}, publish() {}, gameBroadcast() {} },
		logger: quiet,
		name: 'Test',
		handSize: 3,
		packs: ['base'],
	});

// Two players, both ready: the round has started
const started = () => {
	const game = newGame();
	const ada = game.addPlayer('Ada');
	const bo = game.addPlayer('Bo');

	expect(game.act(ada.id, 'ready')).toEqual({ ok: true });
	expect(game.act(bo.id, 'ready')).toEqual({ ok: true });

	return { game, ada, bo };
};

const handOf = (game, id) => game.hands[id];

test('a round: everyone ready, plays a card, votes, and the winner scores', () => {
	const { game, ada, bo } = started();

	expect(game.stage).toBe('play');

	const adaCard = handOf(game, ada.id)[0];
	const boCard = handOf(game, bo.id)[1];

	expect(game.act(ada.id, 'play', { card: adaCard })).toEqual({ ok: true });
	expect(handOf(game, ada.id)).not.toContain(adaCard);
	expect(handOf(game, ada.id)).toHaveLength(3);
	// Their own page keeps the card they have down in front of them; no one else's does
	expect(game.viewFor(ada.id).selected).toBe(adaCard);
	expect(game.viewFor(bo.id).selected).toBe(false);
	expect(game.act(bo.id, 'play', { card: boCard })).toEqual({ ok: true });
	expect(game.stage).toBe('vote');
	// Who played which card stays unsaid until the votes are in
	expect(game.toClient().results).toEqual([]);

	expect(game.act(ada.id, 'vote', { card: boCard })).toEqual({ ok: true });
	// The card they voted for is theirs to see too, and neither is in what everyone (or a watcher) is sent
	expect(game.viewFor(ada.id).selected).toBe(boCard);
	expect(game.viewFor(bo.id).selected).toBe(false);
	expect(game.toClient()).not.toHaveProperty('selected');
	expect(game.viewFor(null)).not.toHaveProperty('selected');
	expect(game.act(bo.id, 'vote', { card: adaCard })).toEqual({ ok: true });
	expect(game.stage).toBe('end');
	expect(game.scores[ada.id]).toEqual({ votes: 1, wins: expect.any(Number) });
	expect(game.scores[game.lastRoundWinner.playerId].wins).toBe(1);
	expect(game.toClient().results).toHaveLength(2);
	expect(game.toClient().results).toContainEqual({ playerId: ada.id, card: adaCard, votes: 1 });
	expect(game.toClient().results).toContainEqual({ playerId: bo.id, card: boCard, votes: 1 });

	// Play again: the next round's black card, and everyone waiting until they ready up
	const black = game.black;

	expect(game.act(ada.id, 'ready')).toEqual({ ok: true });
	expect(game.stage).toBe('wait');
	expect(game.black).not.toBe(black);
	expect(game.act(bo.id, 'ready')).toEqual({ ok: true });
	expect(game.stage).toBe('play');
});

test('a card not in the hand, or out of turn, is refused', () => {
	const { game, ada, bo } = started();

	expect(game.act(ada.id, 'play', { card: handOf(game, bo.id)[0] })).toEqual({
		ok: false,
		error: 'That card is not in your hand',
	});
	expect(game.act(ada.id, 'play', { card: { not: 'a card' } }).ok).toBe(false);
	expect(game.act(ada.id, 'play').ok).toBe(false);
	expect(game.act(ada.id, 'vote', { card: handOf(game, ada.id)[0] })).toEqual({
		ok: false,
		error: 'Not the time to vote',
	});

	const card = handOf(game, ada.id)[0];

	game.act(ada.id, 'play', { card });
	expect(game.act(ada.id, 'play', { card: handOf(game, ada.id)[0] })).toEqual({
		ok: false,
		error: 'Not the time to play a card',
	});
	expect(game.act(ada.id, 'ready')).toEqual({ ok: false, error: 'Already ready' });
});

test('a vote is for a card someone else played', () => {
	const { game, ada, bo } = started();
	const adaCard = handOf(game, ada.id)[0];
	const boCard = handOf(game, bo.id)[0];

	game.act(ada.id, 'play', { card: adaCard });
	game.act(bo.id, 'play', { card: boCard });

	expect(game.act(ada.id, 'vote', { card: adaCard })).toEqual({ ok: false, error: 'Vote for someone else' });
	expect(game.act(ada.id, 'vote', { card: 'Not played' })).toEqual({ ok: false, error: 'That card was not played' });
	expect(game.stage).toBe('vote');
});

test('a poke is for another player, and reaches the pages on the game', () => {
	const game = newGame();
	const sent = [];

	game.server.gameBroadcast = (_gameId, data) => sent.push(data);

	const ada = game.addPlayer('Ada');
	const bo = game.addPlayer('Bo');

	expect(game.act(ada.id, 'poke', { targetPlayerId: bo.id })).toEqual({ ok: true });
	expect(sent.at(-1)).toMatchObject({ update: 'poke', targetPlayerId: bo.id, targetPlayerName: 'Bo' });
	expect(game.act(ada.id, 'poke', { targetPlayerId: ada.id })).toEqual({ ok: false, error: 'Poke someone else' });
	expect(game.act(ada.id, 'poke', { targetPlayerId: 'nobody' })).toEqual({ ok: false, error: 'No such player' });
});

test('joining again at the end of a round starts the next one, ready', () => {
	const { game, ada, bo } = started();
	const adaCard = handOf(game, ada.id)[0];
	const boCard = handOf(game, bo.id)[0];

	game.act(ada.id, 'play', { card: adaCard });
	game.act(bo.id, 'play', { card: boCard });
	game.act(ada.id, 'vote', { card: boCard });
	game.act(bo.id, 'vote', { card: adaCard });

	game.onPlayerRejoined(game.players.get(ada.id));
	expect(game.stage).toBe('wait');
	expect(game.players.get(ada.id).stage).toBe('play');
	expect(game.players.get(bo.id).stage).toBe('wait');
});

test("a player's page shows their own hand alone; the lobby and watchers see no hand, nor who played which card", () => {
	const sent = [];
	const game = newGame();

	game.server.gameBroadcast = (_gameId, data) => sent.push(data);

	const { ada, bo } = (() => {
		const ada = game.addPlayer('Ada');
		const bo = game.addPlayer('Bo');

		game.act(ada.id, 'ready');
		game.act(bo.id, 'ready');

		return { ada, bo };
	})();
	const everyHand = [...handOf(game, ada.id), ...handOf(game, bo.id)];
	const shows = view => everyHand.filter(card => JSON.stringify(view).includes(JSON.stringify(card)));

	expect(game.viewFor(ada.id).hand).toEqual(handOf(game, ada.id));
	expect(shows(game.viewFor(ada.id))).toEqual(handOf(game, ada.id));
	expect(shows(game.viewFor(null))).toEqual([]);
	expect(shows(game.toClient())).toEqual([]);
	expect(shows(sent)).toEqual([]);

	const adaCard = handOf(game, ada.id)[0];
	const boCard = handOf(game, bo.id)[0];

	game.act(ada.id, 'play', { card: adaCard });
	expect(game.toClient().players.find(({ id }) => id === ada.id).selectedCard).toBe(true);
	game.act(bo.id, 'play', { card: boCard });

	expect(game.viewFor(ada.id).submissions).toEqual([boCard]);
	expect(game.viewFor(null).submissions.sort()).toEqual([adaCard, boCard].sort());
	expect(JSON.stringify(game.viewFor(null).submissions)).not.toContain(ada.id);
});

test('a save from before hands moved off the players comes back with them in hands', () => {
	const old = {
		id: 'old',
		name: 'Old',
		options: { handSize: 2, packs: ['base'] },
		players: [{ id: 'ada', name: 'Ada', cards: ['One', 'Two'], stage: 'wait', selectedCard: false }],
		cards: { blacks: ['A _____'], whites: ['Three'] },
		black: 'B _____',
		stage: 'wait',
	};
	const game = new Game({ saveState: old, server: { games: {}, publish() {} }, logger: quiet });

	expect(game.hands).toEqual({ ada: ['One', 'Two'] });
	expect(game.players.get('ada').cards).toBeUndefined();
	expect(game.toSaveState()).toMatchObject({ version: 2, hands: { ada: ['One', 'Two'] } });
	expect(game.viewFor('ada').hand).toEqual(['One', 'Two']);
});

test('a room with no packs, packs of one color or a hand too small is refused; malformed actions are refused, not thrown', () => {
	const make = options => () =>
		new Game({
			server: { games: {}, publish() {} },
			logger: quiet,
			name: 'Bad',
			handSize: 3,
			packs: ['base'],
			...options,
		});

	expect(make({ packs: [] })).toThrow('Pick at least one card pack');
	expect(make({ packs: 'base' })).toThrow('Pick at least one card pack');
	expect(make({ packs: ['no such pack'] })).toThrow('Pick at least one card pack');
	// A pack of white cards alone, with no black card to answer
	cards.db['only whites'] = { data: { whites: ['A', 'B', 'C'] } };
	cards.db['only blacks'] = { data: { blacks: ['_____?'] } };
	expect(make({ packs: ['only whites'] })).toThrow('These packs need both black and white cards');
	expect(make({ packs: ['only blacks'] })).toThrow('These packs need both black and white cards');
	expect(make({ packs: ['only whites', 'only blacks'] })().black).toBe('_____?');
	delete cards.db['only whites'];
	delete cards.db['only blacks'];
	expect(make({ handSize: 1 })).toThrow('The hand size is a whole number from 2 to 30');
	expect(make({ handSize: 'lots' })).toThrow('The hand size is a whole number from 2 to 30');
	expect(make({ handSize: '4' })().options.handSize).toBe(4);

	const { game, ada } = started();

	expect(handOf(game, ada.id)).toHaveLength(3);
	for (const data of [null, 7, 'card', { card: null }, { card: ['a'] }]) {
		expect(game.act(ada.id, 'play', data).error).toBe('That card is not in your hand');
		expect(game.act(ada.id, 'vote', data).error).toBe('Not the time to vote');
		expect(game.act(ada.id, 'poke', data).error).toBe('No such player');
	}
});

test('someone joining mid-round sits it out (or joins it while cards are being played) without holding it up', () => {
	const { game, ada, bo } = started();
	const cy = game.addPlayer('Cy');
	const adaCard = handOf(game, ada.id)[0];
	const boCard = handOf(game, bo.id)[0];

	game.act(ada.id, 'play', { card: adaCard });
	game.act(bo.id, 'play', { card: boCard });
	expect(game.stage).toBe('vote');
	expect(game.act(cy.id, 'ready')).toEqual({ ok: false, error: 'The next round starts after this one' });

	game.act(ada.id, 'vote', { card: boCard });
	game.act(bo.id, 'vote', { card: adaCard });
	expect(game.stage).toBe('end');
	expect(game.scores[cy.id]).toBeUndefined();

	// Ready while cards are being played: in this round
	game.act(cy.id, 'ready');
	game.act(ada.id, 'ready');
	game.act(bo.id, 'ready');
	expect(game.stage).toBe('play');

	const dee = game.addPlayer('Dee');

	expect(game.act(dee.id, 'ready')).toEqual({ ok: true });
	for (const player of [ada, bo, cy]) game.act(player.id, 'play', { card: handOf(game, player.id)[0] });
	expect(game.stage).toBe('play');
	game.act(dee.id, 'play', { card: handOf(game, dee.id)[0] });
	expect(game.stage).toBe('vote');
	expect(game.submissions).toHaveLength(4);
});

test('someone leaving mid-round lets it go on, or calls it off when one player is left', () => {
	const { game, ada, bo } = started();
	const cy = game.addPlayer('Cy');

	game.act(cy.id, 'ready');
	game.act(ada.id, 'play', { card: handOf(game, ada.id)[0] });
	game.act(bo.id, 'play', { card: handOf(game, bo.id)[0] });
	game.removePlayer(cy.id);
	expect(game.stage).toBe('vote');

	game.removePlayer(bo.id);
	expect(game.stage).toBe('wait');
	expect(game.players.get(ada.id)).toMatchObject({ stage: 'wait', selectedCard: false });
	// Nothing of the round called off is left to show: no cards played, no winner, no results
	expect(game.toClient()).toMatchObject({ submissions: [], results: [], lastRoundWinner: {} });
	expect(game.viewFor(ada.id).selected).toBe(false);
});
