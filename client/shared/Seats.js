import { Button, Component, Notify, styled } from '@vanilla-bean/components';

import { act } from '@fatlard1993/web-game-framework/client';

/**
 * Where a player is in what the game is waiting for: done with it, still at it, or sitting this round out
 * @param {object} game - The game, as a page is shown it
 * @param {object} player - One of its players
 * @returns {{ text: string, done: boolean, out?: boolean, aside?: boolean }} What to say of them, whether the game
 * waits on them, and whether they're out of this round or have no part in what it's waiting for
 */
export const seatStatus = (game, player) => {
	if (game.stage === 'end') return { text: '', done: true, aside: true };
	if (game.stage === 'tiebreak') {
		const { players, waiting, phase } = game.tiebreak;

		// Only the tied have anything to do
		if (!players.includes(player.id)) return { text: '', done: true, aside: true };
		if (!waiting.includes(player.id)) return { text: 'Move made', done: true };

		return { text: phase === 'choose' ? 'Choosing a move' : 'Rewriting', done: false };
	}
	if (game.stage === 'wait')
		return player.stage === 'play' ? { text: 'Ready', done: true } : { text: 'Not ready', done: false };
	if (player.stage === 'wait') return { text: 'Next round', done: true, out: true };
	if (game.stage === 'play')
		return player.stage === 'vote' ? { text: 'Played', done: true } : { text: 'Choosing', done: false };

	return player.stage === 'end' ? { text: 'Voted', done: true } : { text: 'Voting', done: false };
};

/**
 * Who the game is waiting on, by name
 * @param {object} game - The game
 * @returns {string[]} Their names
 */
export const waitingOn = game => game.players.filter(player => !seatStatus(game, player).done).map(({ name }) => name);

export const listNames = names =>
	names.length < 3 ? names.join(' and ') : `${names[0]}, ${names[1]} and ${names.length - 2} more`;

const Seat = styled(
	Component,
	() => `
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 54px;
		box-sizing: border-box;
		padding: 8px 10px 8px 14px;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1.5px var(--rule-strong);
		transition: background-color 0.25s, color 0.25s;

		/* Done, their seat turns its white face up */
		&.done {
			background: var(--paper);
			color: var(--ink);
			box-shadow: var(--card-shadow);
		}

		&.out {
			opacity: 0.55;
		}

		& .who {
			flex: 1;
			min-width: 0;
		}

		& .name {
			font-weight: 800;
			letter-spacing: -0.015em;
			overflow-wrap: anywhere;
		}

		& .status {
			font-size: 0.7rem;
			font-weight: 700;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			opacity: 0.68;
		}

		& .status:empty {
			display: none;
		}

		& .wins {
			font-weight: 800;
			font-variant-numeric: tabular-nums;
			opacity: 0.8;
		}

		& .vbc-button {
			padding: 6px 12px;
			font-size: 0.85rem;
		}
	`,
);

/**
 * The players at the table: each seat says where its player is in what the game waits for, and a player can poke
 * whoever is holding things up.
 * @param {object} options - Options
 * @param {object} options.game - The game
 * @param {string} [options.playerId] - Whose page this is; a watcher has none, and pokes no one
 */
export default class Seats extends styled(
	Component,
	() => `
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr));
		gap: 10px;
		width: 100%;
	`,
) {
	build() {
		const { game, playerId } = this.options;

		game.players.forEach(player => {
			const { text, done, out, aside } = seatStatus(game, player);
			const wins = game.scores[player.id]?.wins;
			const you = player.id === playerId;

			new Seat(
				{ appendTo: this, addClass: [done && !out && !aside ? 'done' : '', out ? 'out' : ''] },
				new Component(
					{ addClass: 'who' },
					new Component({ addClass: 'name', textContent: you ? `${player.name} (you)` : player.name }),
					new Component({ addClass: 'status', textContent: text }),
				),
				wins
					? new Component({ addClass: 'wins', textContent: `${wins} won`, attributes: { title: 'Rounds won' } })
					: '',
				playerId && !you && !done
					? new Button({
							content: 'Poke',
							addClass: 'quiet',
							onPointerPress: async event => {
								const poked = await act('poke', { targetPlayerId: player.id });

								if (!poked.ok) return;

								new Notify({
									x: event.clientX,
									y: event.clientY,
									content: `Poked ${player.name}`,
									intent: 'success',
									timeout: 1300,
								});
							},
						})
					: '',
			);
		});
	}
}
