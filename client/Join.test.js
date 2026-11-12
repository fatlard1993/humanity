import { waitFor } from '@testing-library/dom';

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

	test('keeps the saved seat when the server fails', async () => {
		localStorage.setItem('g500', 'p1');
		answer(500, { error: 'The database is locked' });
		made = new Join({ appendTo: container, gameId: 'g500' });

		await waitFor(() => expect(window.location.hash).toBe('#/hub'));
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
