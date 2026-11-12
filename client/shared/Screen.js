import { Button, Component, Link, View, styled } from '@vanilla-bean/components';

import { href, paths } from '../paths.js';

/**
 * The game's name beside its two cards: a link to the hub
 */
export class Wordmark extends styled(
	Link,
	() => `
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		text-decoration: none;
		user-select: none;

		&, &:visited {
			color: inherit;
		}

		& .cards {
			position: relative;
			width: 26px;
			height: 26px;
			flex-shrink: 0;

			&::before, &::after {
				content: '';
				position: absolute;
				width: 13px;
				height: 18px;
				border-radius: 3px;
			}

			&::before {
				left: 2px;
				top: 2px;
				background: var(--ink);
				outline: 1.5px solid var(--paper);
				transform: rotate(-10deg);
			}

			&::after {
				right: 1px;
				bottom: 1px;
				background: var(--paper);
				transform: rotate(8deg);
			}
		}
	`,
	{ href: href(paths.hub), tooltip: false, attributes: { 'aria-label': 'Humanity: back to the games' } },
) {
	build() {
		super.build?.();

		this.append(
			new Component({ addClass: 'cards' }),
			new Component({ tag: 'span', addClass: 'word', textContent: 'Humanity' }),
		);
	}
}

const Bar = styled(
	Component,
	({ media }) => `
		flex-shrink: 0;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 12px;
		min-height: 60px;
		box-sizing: border-box;
		padding: calc(10px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) 10px
			calc(16px + env(safe-area-inset-left, 0px));
		border-bottom: 1px solid var(--rule);

		& > .side {
			display: flex;
			align-items: center;
			gap: 8px;
			min-width: 0;
		}

		& > .right {
			justify-content: flex-end;
		}

		& > .titles {
			min-width: 0;
			text-align: center;
		}

		& .title {
			font-size: 1.05rem;
			font-weight: 800;
			letter-spacing: -0.02em;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		& .stage {
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: var(--muted);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		& .title:empty, & .stage:empty {
			display: none;
		}

		@media ${media.phone} {
			grid-template-columns: auto minmax(0, 1fr) auto;
			padding-left: calc(12px + env(safe-area-inset-left, 0px));
			padding-right: calc(12px + env(safe-area-inset-right, 0px));

			/* Beside a room's name there's room for the cards alone */
			&:has(.title:not(:empty)) .word {
				display: none;
			}
		}
	`,
);

const Body = styled(
	Component,
	() => `
		flex: 1;
		min-height: 0;
		overflow: hidden auto;
		display: flex;
		flex-direction: column;
		position: relative;
	`,
);

// What the screen is for: its one or two actions, where a thumb is
const Dock = styled(
	Component,
	() => `
		flex-shrink: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 10px 12px;
		padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
		border-top: 1px solid var(--rule);
		background: rgb(16 15 14 / 0.72);

		&:empty {
			display: none;
		}

		& > :is(.vbc-button, a.variant-button):not(.icon) {
			min-width: min(240px, 100%);
			padding: 13px 22px;
			font-size: 1.05rem;
		}

		& > .note {
			flex: 1 0 100%;
			text-align: center;
			color: var(--muted);
			font-size: 0.92rem;
		}

		& > .note:only-child {
			padding: 6px 0;
		}
	`,
);

/**
 * A screen of the game: a bar across the top (where you are, and the ways out), the table, and a dock along the
 * bottom for what you do here.
 */
export default class Screen extends View {
	build() {
		this.bar = new Bar({ appendTo: this });
		this._left = new Component({ addClass: ['side', 'left'], appendTo: this.bar });
		this._titles = new Component({ addClass: 'titles', appendTo: this.bar });
		this._title = new Component({ addClass: 'title', appendTo: this._titles, attributes: { role: 'heading' } });
		this._stage = new Component({ addClass: 'stage', appendTo: this._titles });
		this._right = new Component({ addClass: ['side', 'right'], appendTo: this.bar });

		this.body = new Body({ appendTo: this });
		this.dock = new Dock({ appendTo: this });
	}

	// The room (or the screen's name) and, under it, what is happening
	title(title = '', stage = '') {
		this._title.elem.textContent = title;
		this._title.elem.title = title;
		this._stage.elem.textContent = stage;
		document.title = title ? `${title} - Humanity` : 'Humanity';
	}

	left(...items) {
		this._left.empty();
		this._left.append(items.filter(Boolean));
	}

	right(...items) {
		this._right.empty();
		this._right.append(items.filter(Boolean));
	}

	// The dock's buttons, and a line of what's being waited for
	actions(...items) {
		this.dock.empty();
		this.dock.append(
			items
				.filter(Boolean)
				.map(item => (typeof item === 'string' ? new Component({ addClass: 'note', textContent: item }) : item)),
		);
	}
}

export const quiet = (content, onPointerPress, options = {}) =>
	new Button({ content, onPointerPress, ...options, addClass: ['quiet', ...(options.addClass ?? [])] });

// A way to another screen: a Link, drawn as a button
export const goTo = (textContent, address, options = {}) =>
	new Link({ textContent, href: address, variant: 'button', tooltip: false, ...options });
