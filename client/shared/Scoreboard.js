import { Component, styled } from '@vanilla-bean/components';

/**
 * The standings: everyone at the table by rounds won, then by votes taken
 * @param {object} options - Options
 * @param {object} options.game - The game
 * @param {string} [options.playerId] - Whose page this is, to mark their row
 */
export default class Scoreboard extends styled(
	Component,
	() => `
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;

		& th {
			padding: 0 10px 8px;
			font-size: 0.7rem;
			font-weight: 700;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			text-align: right;
			color: var(--muted);
		}

		& td {
			padding: 9px 10px;
			border-top: 1px solid var(--rule);
			text-align: right;
			font-weight: 700;
		}

		& th:nth-child(2), & td:nth-child(2) {
			text-align: left;
			width: 100%;
			overflow-wrap: anywhere;
		}

		& td:first-child {
			color: var(--muted);
		}

		& tr.you td:nth-child(2) {
			color: var(--mark);
		}

		& tr.gone td:nth-child(2) {
			color: var(--muted);
			font-style: italic;
		}
	`,
	{ tag: 'table' },
) {
	build() {
		const { game, playerId } = this.options;
		const rows = [
			...game.players.map(({ id, name }) => ({ id, name })),
			// Someone who scored and has since left keeps their line
			...Object.keys(game.scores)
				.filter(id => !game.players.some(player => player.id === id))
				.map(id => ({ id, name: 'Someone who left', gone: true })),
		]
			.map(row => ({ ...row, wins: game.scores[row.id]?.wins ?? 0, votes: game.scores[row.id]?.votes ?? 0 }))
			.sort((a, b) => b.wins - a.wins || b.votes - a.votes);

		const row = (tag, cells, className) => {
			const tr = document.createElement('tr');

			if (className) tr.className = className;
			cells.forEach(text => {
				const cell = document.createElement(tag);

				cell.textContent = text;
				tr.append(cell);
			});

			return tr;
		};

		this.elem.append(
			row('th', ['', 'Player', 'Won', 'Votes']),
			...rows.map(({ id, name, wins, votes, gone }, index) =>
				row('td', [index + 1, name, wins, votes], (id === playerId && 'you') || (gone && 'gone')),
			),
		);
	}
}
