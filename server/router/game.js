import { requestMatch } from '@vanilla-bean/components/app';
import { randFromArray } from '@vanilla-bean/components/utils';

import cards from '../cards.js';

const _game = async request => {
	let match;

	match = requestMatch('GET', '/packs', request);
	if (match) return Response.json(Object.keys(cards.db));

	match = requestMatch('GET', '/packs/random-name', request);
	if (match) {
		if (!cards._shortWhites) {
			const htmlTag = /<[^>]+>/;
			cards._shortWhites = Object.values(cards.db)
				.flatMap(pack => pack.data.whites || [])
				.filter(card => {
					const words = card.trim().split(/\s+/);
					return words.length <= 3 && !htmlTag.test(card) && card.length <= 30;
				});
		}

		const name = randFromArray(cards._shortWhites);
		return Response.json(name);
	}
};

export default _game;
