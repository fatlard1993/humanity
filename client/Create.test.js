import { fireEvent, screen, waitFor, within } from '@testing-library/dom';

// The framework's client opens the game socket; this one never connects
class QuietSocket extends EventTarget {
	readyState = 0;
	send() {}
	close() {}
}

describe('Create', () => {
	const RealSocket = globalThis.WebSocket;
	let Create;
	let fetchSpy;
	let made;
	let created;

	beforeAll(async () => {
		globalThis.WebSocket = QuietSocket;
		({ default: Create } = await import('./Create.js'));
	});

	afterAll(() => {
		globalThis.WebSocket = RealSocket;
	});

	beforeEach(() => {
		created = [];
		fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
			if (String(url).includes('random-name')) return Response.json('The Room');
			if (options?.method === 'POST') {
				created.push(JSON.parse(options.body));

				return Response.json({ message: 'The table is full' }, { status: 500 });
			}

			return Response.json([
				{ name: 'base', blacks: 90, whites: 460 },
				{ name: 'whites', blacks: 0, whites: 50 },
			]);
		});
	});

	afterEach(() => {
		fetchSpy.mockRestore();
		made?.destroy();
		localStorage.clear();
	});

	const press = name => fireEvent.click(screen.getByRole('button', { name }));

	test('the room name, the hand stepper and the pack chips are named by their captions', async () => {
		made = new Create({ appendTo: container });

		const hand = await screen.findByRole('group', { name: 'Hand' });
		const packs = screen.getByRole('group', { name: 'Packs' });

		expect(screen.getByRole('textbox', { name: 'Room name' })).toBeTruthy();
		expect(within(hand).getAllByRole('button')).toHaveLength(2);
		expect(within(packs).getByRole('button', { name: /base/ })).toBeTruthy();
	});

	test('packs that leave nothing to deal are said under the packs as they are picked, and Deal asks nothing', async () => {
		made = new Create({ appendTo: container });
		const packs = await screen.findByRole('group', { name: 'Packs' });

		press('Pick none');
		await waitFor(() => expect(packs).toHaveAccessibleDescription('Pick at least one pack'));

		press(/whites/);
		await waitFor(() => expect(packs).toHaveAccessibleDescription('These packs need both black and white cards'));

		press('Deal the cards');
		await new Promise(resolve => setTimeout(resolve, 50));
		expect(created).toHaveLength(0);
	});

	test('a pick checks the packs alone, not a name still to be typed', async () => {
		made = new Create({ appendTo: container });
		const packs = await screen.findByRole('group', { name: 'Packs' });
		const name = screen.getByRole('textbox', { name: 'Room name' });

		await waitFor(() => expect(name).toHaveValue('The Room'));
		fireEvent.input(name, { target: { value: '' } });
		press('Pick none');

		await waitFor(() => expect(packs).toHaveAccessibleDescription('Pick at least one pack'));
		expect(name).not.toHaveAttribute('aria-invalid');
	});

	test('a create the server refuses says why beside Deal, with what was picked sent', async () => {
		made = new Create({ appendTo: container });
		await screen.findByRole('group', { name: 'Hand' });
		await waitFor(() => expect(screen.getByRole('textbox', { name: 'Room name' })).toHaveValue('The Room'));

		press('Make the hand bigger');
		press('Deal the cards');

		await waitFor(() =>
			expect(within(made.dock.elem).getByRole('alert')).toHaveTextContent(
				"Couldn't create the game: The table is full",
			),
		);
		expect(created).toEqual([{ name: 'The Room', handSize: 11, packs: ['base'] }]);
	});
});
