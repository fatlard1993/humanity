import { Component, Dialog, Notify, copyToClipboard, styled } from '@vanilla-bean/components';

import { deleteGame, joinUrl } from '@fatlard1993/web-game-framework/client';
import JoinCard from '@fatlard1993/web-game-framework/ui/JoinCard';

const Details = styled(
	Component,
	({ media }) => `
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 22px;
		align-items: start;

		& h3 {
			margin: 0 0 4px;
			font-size: 0.7rem;
			font-weight: 700;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: var(--muted);
		}

		& p {
			margin: 0 0 16px;
			font-weight: 700;
			overflow-wrap: anywhere;
		}

		@media ${media.phone} {
			grid-template-columns: 1fr;
		}
	`,
);

/**
 * A room, in full: who's in it, what it's played with, the code and link that get someone else in, and the way to
 * close it for good.
 * @param {object} options - Options
 * @param {object} options.game - The room
 * @param {boolean} [options.remove] - Offer to delete the room (default true)
 */
export default class RoomDialog extends Dialog {
	constructor({ remove = true, ...options } = {}) {
		const { game } = options;

		super({
			size: 'fit',
			header: game.name,
			buttons: [
				...(remove ? [{ textContent: 'Delete room', intent: 'danger' }] : []),
				{ textContent: 'Copy link', addClass: 'quiet' },
				'Close',
			],
			onButtonPress: async ({ button, event, closeDialog }) => {
				if (button?.textContent === 'Copy link') {
					copyToClipboard(await joinUrl(game.id));
					new Notify({ x: event.clientX, y: event.clientY, content: 'Link copied', intent: 'success', timeout: 1300 });

					return;
				}

				if (button?.textContent === 'Delete room') {
					const sure = await Dialog.confirm({
						header: `Delete ${game.name}?`,
						body:
							game.players.length > 0
								? `${game.players.length} at the table lose their seats, hands and scores.`
								: 'The room and its deck are gone for good.',
						intent: 'danger',
						confirmLabel: 'Delete it',
						cancelLabel: 'Keep it',
					});

					if (!sure) return;

					await deleteGame(game.id);
				}

				closeDialog();
			},
			...options,
		});
	}

	build() {
		super.build();

		const { game } = this.options;
		const { packs = [], handSize } = game.options ?? {};
		const detail = (label, text) => [
			new Component({ tag: 'h3', textContent: label }),
			new Component({ tag: 'p', textContent: text }),
		];

		new Details(
			{ appendTo: this.body },
			new Component(
				{},
				...detail(
					game.players.length === 1 ? '1 player' : `${game.players.length} players`,
					game.players.map(({ name }) => name).join(', ') || 'Nobody yet',
				),
				...detail(packs.length === 1 ? '1 pack' : `${packs.length} packs`, packs.join(', ')),
				...detail('Hand', `${handSize} cards`),
				...detail('Left in the deck', `${game.cards.blacksRemaining} black, ${game.cards.whitesRemaining} white`),
			),
			new JoinCard({ gameId: game.id, size: 190 }),
		);
	}
}
