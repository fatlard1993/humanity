import { href, paths } from './paths.js';

describe('href', () => {
	test("fills a path's params into its address", () => {
		expect(href(paths.hub)).toBe('#/hub');
		expect(href(paths.play, { gameId: 'a b' })).toBe('#/play/a%20b');
	});
});
