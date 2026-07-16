import Card from './Card.js';

describe('Card', () => {
	let card;

	afterEach(() => {
		card?.destroy?.();
		card = null;
	});

	test('renders with its type as a class', () => {
		card = new Card({ appendTo: container, type: 'black', innerHTML: 'What does bigfoot eat _____' });

		expect(card.elem.classList.contains('type-black')).toBe(true);
		expect(card.elem).toHaveTextContent('What does bigfoot eat _____');
	});

	test('changing type swaps the type class instead of stacking', () => {
		card = new Card({ appendTo: container, type: 'black' });

		card.options.type = 'white';

		expect(card.elem.classList.contains('type-white')).toBe(true);
		expect(card.elem.classList.contains('type-black')).toBe(false);
	});
});
