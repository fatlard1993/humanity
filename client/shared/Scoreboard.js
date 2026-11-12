import { Table, styled } from '@vanilla-bean/components';

/**
 * The standings: everyone at the table by rounds won, then by votes taken
 * @param {object} options - Options
 * @param {object} options.game - The game
 * @param {string} [options.playerId] - Whose page this is, to mark their row
 */
export default class Scoreboard extends styled(
	Table,
	() => `
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;

		/* On the table, not on the Table's own surface */
		& thead, & tbody {
			background: none;
		}

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

		& td.you {
			color: var(--mark);
		}

		& td.gone {
			color: var(--muted);
			font-style: italic;
		}
	`,
) {
	constructor({ game, playerId, ...options }) {
		super({ ...options, columns: Scoreboard.columns(playerId), data: Scoreboard.rows(game) });
	}

	static columns(playerId) {
		return [
			{ key: 'rank', content: '' },
			{
				key: 'name',
				content: 'Player',
				dataColumn: ({ rowData }) => ({
					addClass: (rowData.id === playerId && 'you') || (rowData.gone && 'gone') || undefined,
				}),
			},
			{ key: 'wins', content: 'Won' },
			{ key: 'votes', content: 'Votes' },
		];
	}

	static rows(game) {
		const rows = [
			...game.players.map(({ id, name }) => ({ id, name })),
			// Someone who scored and has since left keeps their line
			...Object.keys(game.scores)
				.filter(id => !game.players.some(player => player.id === id))
				.map(id => ({ id, name: 'Someone who left', gone: true })),
		]
			.map(row => ({ ...row, wins: game.scores[row.id]?.wins ?? 0, votes: game.scores[row.id]?.votes ?? 0 }))
			.sort((a, b) => b.wins - a.wins || b.votes - a.votes);

		return rows.map((row, index) => ({ ...row, rank: index + 1 }));
	}
}
