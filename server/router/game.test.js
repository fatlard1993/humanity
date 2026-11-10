import { expect, test } from 'bun:test';

import cards from '../cards.js';
import gameRoutes from './game.js';

cards.init();

test('GET /packs gives each pack its name and how many black and white cards it holds', async () => {
	const response = await gameRoutes(new Request('http://localhost/packs'));
	const packs = await response.json();
	const base = cards.db.base.data;

	expect(packs).toHaveLength(Object.keys(cards.db).length);
	expect(packs).toContainEqual({ name: 'base', blacks: base.blacks.length, whites: base.whites.length });
	// A pack with no cards of one color says so, for the create screen to turn down on its own
	expect(packs.find(({ name }) => name === 'fontAwesome').blacks).toBe(0);
});
