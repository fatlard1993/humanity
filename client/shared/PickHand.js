import { randInt } from '@vanilla-bean/components';

import Card, { Hand } from './Card.js';

// A card is 252px across its padding; on a phone two fit side by side, sized from the hand's width (less 16px for their
// tilt), with the overlap and padding in step. The resting translate takes half the overlap there so the pair sits
// centered.
const fitted = ({ media }) => `
	padding: 0 42px;
	box-sizing: border-box;

	@media ${media.phone} {
		container-type: inline-size;
		padding: 0 12px;

		--card-size: min(252px, calc((100cqi - 16px) / 1.84));
		--card-pad: max(10px, calc(var(--card-size) * 18 / 252));
		--overlap-x: calc(var(--card-size) * 40 / 252);
		--overlap-y: calc(var(--card-size) * 102 / 252);
		--shift-x: calc(var(--overlap-x) / 2);

		& > .type-white {
			width: calc(var(--card-size) - 2 * var(--card-pad));
			height: calc(var(--card-size) * 9 / 7 - 2 * var(--card-pad));
			padding: var(--card-pad);
			font-size: clamp(14px, calc(var(--card-size) * 16 / 252), 16px);

			&::before {
				left: var(--card-pad);
			}

			&::after {
				left: calc(var(--card-pad) + 16px);
			}
		}
	}
`;

const resting = 'translate(var(--shift-x, 40px), var(--overlap-y, 102px))';

/**
 * White cards fanned over each other to pick one from: a hand to play from, or what was played to vote on. Pressing
 * a card lifts it out of the fan; pressing it again, or another, puts it back.
 * @param {object} options - Options
 * @param {string[]} options.cards - The cards' text
 * @param {Function} options.onPick - (card) each time the pick changes: the card's text, or undefined for none
 */
export default class PickHand extends Hand {
	constructor(options) {
		super({ ...options, styles: fitted });
	}

	build() {
		let picked;

		const rest = card => {
			card.removeClass('selected');
			card.elem.setAttribute('aria-pressed', 'false');
			card.elem.style.transform = card.atRest;
		};

		this.options.cards.forEach((content, index) => {
			const card = new Card({
				type: 'white',
				addClass: 'pickable',
				style: {
					marginTop: 'calc(-1 * var(--overlap-y, 102px))',
					marginLeft: 'calc(-1 * var(--overlap-x, 40px))',
				},
				innerHTML: content,
				appendTo: this,
				attributes: { role: 'button', 'aria-pressed': 'false' },
				onPointerPress: () => {
					const again = picked === card;

					if (picked) rest(picked);
					picked = again ? undefined : card;

					if (picked) {
						card.addClass('selected');
						card.elem.setAttribute('aria-pressed', 'true');
						card.elem.style.transform = `${resting} translateY(-34px) rotate(${randInt(-2, 2)}deg) scale(1.05)`;
					}

					this.options.onPick(picked ? content : undefined);
				},
			});

			card.atRest = `${resting} rotate(${(-5 + index) * randInt(1, 3)}deg)`;
			card.elem.style.transform = card.atRest;
			card.pressable(true);
		});
	}

	static schema = { cards: {}, onPick: {} };
}
