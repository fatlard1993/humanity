import { findByRole, fireEvent, getByRole, waitFor } from '@testing-library/dom';

// Join loads the game socket; this one never connects
class QuietSocket extends EventTarget {
	readyState = 0;
	send() {}
	close() {}
}

describe('Join, when the game fails to load', () => {
	const RealSocket = globalThis.WebSocket;
	let Join;
	let fetchSpy;
	let made;

	const answer = (status, body) =>
		(fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json(body, { status })));

	beforeAll(async () => {
		globalThis.WebSocket = QuietSocket;
		({ default: Join } = await import('./Join.js'));
	});

	afterAll(() => {
		globalThis.WebSocket = RealSocket;
	});

	beforeEach(() => {
		window.location.hash = '#/join/g1';
	});

	afterEach(() => {
		fetchSpy?.mockRestore();
		made?.destroy();
		localStorage.clear();
	});

	test('keeps the saved seat when the server fails, and says why with Try again', async () => {
		localStorage.setItem('g500', 'p1');
		answer(500, { error: 'The database is locked' });
		made = new Join({ appendTo: container, gameId: 'g500' });

		await waitFor(() => expect(made.body.elem).toHaveTextContent("Couldn't open the game"));
		expect(made.body.elem).toHaveTextContent('The database is locked');
		expect(getByRole(made.body.elem, 'button', { name: 'Try again' })).toBeTruthy();
		expect(window.location.hash).toBe('#/join/g1');
		expect(localStorage.getItem('g500')).toBe('p1');
	});

	test('forgets the saved seat when the game is gone', async () => {
		localStorage.setItem('g404', 'p1');
		answer(404, { message: 'Game not found' });
		made = new Join({ appendTo: container, gameId: 'g404' });

		await waitFor(() => expect(window.location.hash).toBe('#/hub'));
		expect(localStorage.getItem('g404')).toBeNull();
	});
});

describe('Join, taking a seat', () => {
	const RealSocket = globalThis.WebSocket;
	let Join;
	let fetchSpy;
	let made;
	let joins;

	beforeAll(async () => {
		globalThis.WebSocket = QuietSocket;
		({ default: Join } = await import('./Join.js'));
	});

	afterAll(() => {
		globalThis.WebSocket = RealSocket;
	});

	beforeEach(() => {
		joins = [];
		fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
			if (options?.method === 'POST') {
				joins.push(JSON.parse(options.body));

				return Response.json({ message: 'That name is taken' }, { status: 409 });
			}

			return Response.json({ id: 'g1', name: 'The Room', players: [] });
		});
	});

	afterEach(() => {
		fetchSpy.mockRestore();
		made?.destroy();
		localStorage.clear();
	});

	test('a name is asked for under the field before anything is sent', async () => {
		made = new Join({ appendTo: container, gameId: 'g1' });

		const name = await findByRole(container, 'textbox', { name: 'Your name' });

		fireEvent.click(getByRole(container, 'button', { name: 'Take a seat' }));

		await waitFor(() => expect(name).toHaveAccessibleDescription('You need a name to sit down'));
		expect(joins).toHaveLength(0);
	});

	test('a seat the server refuses says why beside Take a seat, with the name typed sent', async () => {
		made = new Join({ appendTo: container, gameId: 'g1' });

		const name = await findByRole(container, 'textbox', { name: 'Your name' });

		fireEvent.input(name, { target: { value: 'Bea ' } });
		fireEvent.keyDown(name, { key: 'Enter' });

		await waitFor(() =>
			expect(getByRole(made.dock.elem, 'alert')).toHaveTextContent("Couldn't take a seat: That name is taken"),
		);
		expect(joins).toEqual([{ name: 'Bea', playerId: null }]);
	});
});
