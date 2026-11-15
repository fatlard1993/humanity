import { fireEvent, getByRole, waitFor } from '@testing-library/dom';

// Watch opens the game socket; this one never connects
class QuietSocket extends EventTarget {
	readyState = 0;
	send() {}
	close() {}
}

describe('Watch, when the game fails to load', () => {
	const RealSocket = globalThis.WebSocket;
	let Watch;
	let fetchSpy;
	let made;

	beforeAll(async () => {
		globalThis.WebSocket = QuietSocket;
		({ default: Watch } = await import('./Watch.js'));
	});

	afterAll(() => {
		globalThis.WebSocket = RealSocket;
	});

	afterEach(() => {
		fetchSpy?.mockRestore();
		made?.destroy();
		localStorage.clear();
	});

	test('says why, and tries again when asked', async () => {
		localStorage.setItem('g500', 'p1');
		fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async () =>
			Response.json({ error: 'The database is locked' }, { status: 500 }),
		);
		made = new Watch({ appendTo: container, gameId: 'g500' });

		await waitFor(() => expect(made.body.elem).toHaveTextContent("Couldn't open the game"));
		expect(made.body.elem).toHaveTextContent('The database is locked');
		// The way in stays beside it
		expect(made.body.elem).toHaveTextContent('Scan to play');

		fireEvent.click(getByRole(made.body.elem, 'button', { name: 'Try again' }));

		await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
	});
});
