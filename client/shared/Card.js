import { Component, styled } from '@vanilla-bean/components';

export const Hand = styled(
	Component,
	() => `
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	`,
);

/**
 * A card of the game: black (the question) or white (an answer), its text in the corner and the game's name at its
 * foot. Face down, a white card shows only its back.
 * @example new Card({ type: 'black', innerHTML: 'What does bigfoot eat _____' })
 * @param {object} options - Options
 * @param {('black'|'white')} options.type - Which deck it's from
 * @param {string} [options.innerHTML] - Its text (a pack's cards may hold markup)
 * @param {boolean} [options.faceDown] - Shows its back, whatever its text
 */
export default class Card extends Component {
	constructor(options) {
		super({
			...options,
			...(options.faceDown && { innerHTML: 'Humanity' }),
			addClass: [`type-${options.type}`, options.faceDown ? 'face-down' : '', options.addClass],
			styles: (theme, Component) => `
				position: relative;
				flex-shrink: 0;
				width: 216px;
				height: 288px;
				padding: 18px;
				border-radius: 14px;
				box-shadow: var(--card-shadow);
				font-family: var(--face);
				font-size: 1.15rem;
				font-weight: 700;
				line-height: 1.22;
				letter-spacing: -0.012em;
				overflow-wrap: break-word;
				transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.3, 1.2);

				/* The game's name at its foot, beside a card of the other color */
				&::after {
					content: 'Humanity';
					position: absolute;
					left: 34px;
					bottom: 15px;
					font-size: 10px;
					letter-spacing: 0;
					opacity: 0.75;
				}

				&::before {
					content: '';
					position: absolute;
					left: 18px;
					bottom: 15px;
					width: 8px;
					height: 11px;
					border-radius: 2px;
					transform: rotate(-12deg);
				}

				&.type-black {
					background-color: var(--ink);
					color: var(--paper);
					outline: 1px solid var(--rule);
					outline-offset: -1px;

					&::before {
						background-color: var(--paper);
					}
				}

				&.type-white {
					background-color: var(--paper);
					color: var(--ink);

					&::before {
						background-color: var(--ink);
					}
				}

				&.face-down {
					font-size: 1.7rem;
					line-height: 1.05;

					&::before, &::after {
						content: none;
					}
				}

				&.pickable {
					cursor: pointer;
					user-select: none;
				}

				&.pickable:hover {
					z-index: 2;
				}

				&.selected {
					z-index: 3;
					outline: 4px solid var(--mark);
					outline-offset: 0;
				}

				${options.styles?.(theme, Component) || ''}
			`,
		});
	}

	static schema = {
		type: {
			set(value) {
				this.removeClass(/\btype-\S+\b/).addClass(`type-${value}`);
			},
		},
		faceDown: {},
	};
}
