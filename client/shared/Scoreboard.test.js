import Scoreboard from './Scoreboard.js';

describe('Scoreboard', () => {
	let board;

	afterEach(() => {
		board?.destroy?.();
		board = null;
	});

	const game = {
		players: [
			{ id: 'a', name: 'Ann' },
			{ id: 'b', name: 'Bo' },
		],
		scores: { b: { wins: 2, votes: 5 }, gone: { wins: 1, votes: 1 } },
	};

	test('is a Table of everyone by rounds won, with whoever left kept on', () => {
		board = new Scoreboard({ appendTo: container, game, playerId: 'a' });

		const rows = [...board.elem.querySelectorAll('tbody tr')].map(row =>
			[...row.querySelectorAll('td')].map(cell => cell.textContent),
		);

		expect(board.elem.tagName).toBe('TABLE');
		expect([...board.elem.querySelectorAll('th')].map(cell => cell.textContent)).toEqual([
			'',
			'Player',
			'Won',
			'Votes',
		]);
		expect(rows).toEqual([
			['1', 'Bo', '2', '5'],
			['2', 'Someone who left', '1', '1'],
			['3', 'Ann', '0', '0'],
		]);
	});

	test('marks whose page it is, and whoever left', () => {
		board = new Scoreboard({ appendTo: container, game, playerId: 'a' });

		const names = board.elem.querySelectorAll('tbody td:nth-child(2)');

		expect(names[2].classList.contains('you')).toBe(true);
		expect(names[1].classList.contains('gone')).toBe(true);
		expect(names[0].classList.contains('you')).toBe(false);
	});
});
