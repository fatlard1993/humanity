import { Wordmark, goTo } from './Screen.js';

describe('Screen', () => {
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
});
