import { Component, Notify, failureReason, styled } from '@vanilla-bean/components';

import { getGames, onMessage } from '@fatlard1993/web-game-framework/client';

import RoomDialog from './shared/RoomDialog.js';
import { go, href, paths } from './paths.js';
import Screen, { Wordmark, goTo, quiet } from './shared/Screen.js';

const STAGES = {
	wait: 'Getting ready',
	play: 'Playing cards',
	vote: 'Voting',
	tiebreak: 'Tiebreaker',
	end: 'Round over',
};

const Table = styled(
	Component,
	({ media }) => `
		width: 100%;
		max-width: 1120px;
		margin: 0 auto;
		padding: 34px 20px 48px;
		box-sizing: border-box;

		& h1 {
			margin: 0 0 6px;
			font-size: clamp(1.9rem, 6vw, 3.1rem);
			font-weight: 800;
			letter-spacing: -0.04em;
			line-height: 1.02;
			text-wrap: balance;
		}

		& .count {
			margin: 0 0 28px;
			font-size: 0.78rem;
			font-weight: 700;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: var(--muted);
		}

		& .rooms {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(236px, 1fr));
			gap: 22px;
		}

		@media ${media.phone} {
			padding: 22px 14px 36px;

			& .rooms {
				grid-template-columns: 1fr;
				gap: 14px;
			}
		}
	`,
);

// A room is a black card, its name where the question would be; starting one is the white card played on it
const Tile = styled(
	Component,
	({ media }) => `
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 300px;
		box-sizing: border-box;
		padding: 20px 18px 16px;
		border-radius: 14px;
		background: var(--ink);
		color: var(--paper);
		outline: 1px solid var(--rule);
		outline-offset: -1px;
		box-shadow: var(--card-shadow);
		transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.3, 1.2);

		&:nth-child(3n + 1) { transform: rotate(-1.1deg); }
		&:nth-child(3n + 2) { transform: rotate(0.7deg); }
		&:nth-child(3n) { transform: rotate(-0.4deg); }

		&:hover, &:focus-within {
			transform: translateY(-4px);
		}

		& .name {
			margin: 0;
			font-size: 1.45rem;
			font-weight: 800;
			letter-spacing: -0.03em;
			line-height: 1.1;
			overflow-wrap: anywhere;
		}

		& .stage {
			margin-top: 12px;
			font-size: 0.7rem;
			font-weight: 700;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: var(--mark);
		}

		& .who, & .packs {
			margin-top: 4px;
			font-size: 0.9rem;
			font-weight: 600;
			color: var(--muted);
			overflow-wrap: anywhere;
		}

		& .actions {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			margin-top: auto;
			padding-top: 18px;

			& > :first-child {
				flex: 1;
			}
		}

		&.new {
			background: var(--paper);
			color: var(--ink);
			outline: none;
			cursor: pointer;
			user-select: none;

			& .hint {
				margin-top: auto;
				font-size: 0.9rem;
				font-weight: 700;
				opacity: 0.7;
			}
		}

		@media ${media.phone} {
			min-height: 0;
			transform: none !important;

			&.new {
				min-height: 132px;
			}
		}
	`,
);

const summary = (names, none) => {
	if (names.length === 0) return none;

	return names.length < 4 ? names.join(', ') : `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
};

export default class Hub extends Screen {
	build() {
		super.build();

		this.title();
		this.left(new Wordmark());
		this.right(goTo('New game', href(paths.create)));

		this.addCleanup(
			'games',
			onMessage(({ update }) => {
				if (['newGame', 'removedGame', 'addPlayer', 'removePlayer'].includes(update)) this.load();
			}),
		);

		this.load();
	}

	// The rooms as they are now, drawn again when one opens, closes, or someone sits down or leaves
	async load() {
		const games = await getGames({ invalidateAfter: 0 });

		if (!this.elem.isConnected) return;
		if (games.response?.status !== 200) {
			new Notify({ intent: 'danger', content: failureReason(games) });

			return;
		}

		const rooms = games.body ?? [];
		const table = new Table(
			{},
			new Component({ tag: 'h1', textContent: 'A card game for terrible people.' }),
			new Component({
				addClass: 'count',
				textContent:
					rooms.length === 0
						? 'Nobody is being terrible right now'
						: `${rooms.length} ${rooms.length === 1 ? 'game' : 'games'} going`,
			}),
		);
		const grid = new Component({ addClass: 'rooms', appendTo: table });

		rooms.forEach(game => this.room(game, grid));

		const start = new Tile(
			{ addClass: 'new', appendTo: grid, attributes: { role: 'button' }, onPointerPress: () => go(paths.create) },
			new Component({ tag: 'h2', addClass: 'name', textContent: 'Start a new game.' }),
			new Component({ addClass: 'hint', textContent: 'Pick the packs, name the room, deal.' }),
		);

		start.pressable(true);

		this.body.empty();
		this.body.append(table);
	}

	room(game, grid) {
		const { id, name, players, stage, options } = game;
		const seated = players.some(player => player.id === localStorage.getItem(id));

		new Tile(
			{ appendTo: grid },
			new Component({ tag: 'h2', addClass: 'name', textContent: name }),
			new Component({ addClass: 'stage', textContent: STAGES[stage] ?? '' }),
			new Component({
				addClass: 'who',
				textContent: summary(
					players.map(player => player.name),
					'Nobody at the table yet',
				),
			}),
			new Component({ addClass: 'packs', textContent: summary(options?.packs ?? [], '') }),
			new Component(
				{ addClass: 'actions' },
				seated
					? goTo('Rejoin', href(paths.play, { gameId: id }), { addClass: 'go' })
					: goTo('Join', href(paths.join, { gameId: id })),
				goTo('Watch', href(paths.watch, { gameId: id }), { addClass: 'quiet' }),
				quiet('', () => new RoomDialog({ game }), {
					icon: 'ellipsis',
					attributes: { 'aria-label': `About ${name}: share or delete it` },
				}),
			),
		);
	}
}
