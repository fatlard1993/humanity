import { Content, Toolbar } from '@vanilla-bean/components';

import Screen, { Wordmark, goTo, quiet } from './Screen.js';

describe('Screen', () => {
	test("is a bar headed by the screen's title, over a Content that scrolls", () => {
		const screen = new Screen({ appendTo: container });

		screen.title('The room', 'Voting');

		expect(screen.bar).toBeInstanceOf(Toolbar);
		expect(screen.bar.elem.classList.contains('variant-bar')).toBe(true);
		expect(screen.bar.elem.querySelector('[role="heading"]')).toHaveTextContent('The room');
		expect(screen.bar.elem).toHaveTextContent('Voting');
		expect(screen.body).toBeInstanceOf(Content);

		screen.title();

		expect(screen.bar.elem.querySelector('[role="heading"]')).toBeNull();

		screen.destroy();
	});

	test('the wordmark is a link to the hub', () => {
		const wordmark = new Wordmark({ appendTo: container });

		expect(wordmark.elem.tagName).toBe('A');
		expect(wordmark.elem.getAttribute('href')).toBe('#/hub');
		expect(wordmark.elem).toHaveAccessibleName('Humanity: back to the games');

		wordmark.destroy();
	});

	test('a way to another screen is a link drawn as a button', () => {
		const link = goTo('Watch', '#/watch/a', { addClass: 'quiet', appendTo: container });

		expect(link.elem.tagName).toBe('A');
		expect(link.elem.getAttribute('href')).toBe('#/watch/a');
		expect(link.elem.classList.contains('variant-button')).toBe(true);
		expect(link.elem).toHaveTextContent('Watch');

		link.destroy();
	});

	test('a quiet button is flat', () => {
		const button = quiet('', () => {}, { icon: 'dice', attributes: { 'aria-label': 'Pick a random name' } });

		expect(button.elem.classList.contains('variant-flat')).toBe(true);
		expect(button.elem.classList.contains('quiet')).toBe(true);

		button.destroy();
	});

	test('a failed load says what failed and why, and tries again when asked', async () => {
		const screen = new Screen({ appendTo: container });
		let tries = 0;

		screen.failed(
			"Couldn't load the games",
			{ status: 'error', body: { message: 'The server is down' } },
			() => tries++,
		);

		expect(screen.body.elem).toHaveTextContent("Couldn't load the games");

		const again = [...screen.body.elem.querySelectorAll('button')].find(button => button.textContent === 'Try again');

		again.click();

		expect(tries).toBe(1);
		expect(screen.body.elem).not.toHaveTextContent("Couldn't load the games");

		screen.destroy();
	});
});
