import { fireEvent, getByRole, waitFor } from '@testing-library/dom';
import { Dialog } from '@vanilla-bean/components';

// The join card opens the game socket; this one never connects
class QuietSocket extends EventTarget {
	readyState = 0;
	send() {}
	close() {}
}

describe('RoomDialog', () => {
	const RealSocket = globalThis.WebSocket;
	let RoomDialog;

	beforeAll(async () => {
		globalThis.WebSocket = QuietSocket;
		({ default: RoomDialog } = await import('./RoomDialog'));
	});
	afterAll(() => (globalThis.WebSocket = RealSocket));

	test('a delete the server refuses leaves the room, and the dialog, and says why', async () => {
		const confirm = spyOn(Dialog, 'confirm').mockImplementation(async () => true);
		const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async () =>
			Response.json({ error: 'The room is in use' }, { status: 409 }),
		);
		const dialog = new RoomDialog({
			game: { id: 'g1', name: 'Friday', players: [], options: {}, cards: { blacksRemaining: 1, whitesRemaining: 1 } },
			appendTo: document.body,
		});

		dialog.open?.();
		fireEvent.click(getByRole(dialog.elem, 'button', { name: /Delete room/, hidden: true }));

		await waitFor(() => expect(document.body.textContent).toContain("Couldn't delete Friday: The room is in use"));
		expect(dialog.elem.isConnected).toBe(true);

		confirm.mockRestore();
		fetchSpy.mockRestore();
		dialog.destroy?.();
	});
});
