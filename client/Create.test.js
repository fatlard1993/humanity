import { screen, within } from '@testing-library/dom';

describe('Create', () => {
	let Create;
	let fetchSpy;
	let made;

	beforeAll(async () => {
		({ default: Create } = await import('./Create.js'));
	});

	beforeEach(() => {
		fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async url =>
			String(url).includes('random-name')
				? Response.json('The Room')
				: Response.json([{ name: 'base', blacks: 90, whites: 460 }]),
		);
	});

	afterEach(() => {
		fetchSpy.mockRestore();
		made?.destroy();
		localStorage.clear();
	});

	test('the hand stepper and the pack chips are groups named by their captions', async () => {
		made = new Create({ appendTo: container });

		const hand = await screen.findByRole('group', { name: 'Hand' });
		const packs = screen.getByRole('group', { name: 'Packs' });

		expect(within(hand).getAllByRole('button')).toHaveLength(2);
		expect(within(packs).getByRole('button', { name: /base/ })).toBeTruthy();
	});
});
