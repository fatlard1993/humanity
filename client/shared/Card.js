import { DomElem, styled } from 'vanilla-bean-components';

export const Hand = styled(
	DomElem,
	() => `
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	`,
);

export default class Card extends DomElem {
	constructor(options) {
		super({
			...options,
			styles: (theme, domElem) => `
				width: 216px;
				height: 288px;
				padding: 18px;
				border-radius: 12px;
				box-shadow: 1px 1px 3px 1px ${theme.colors.black};

				&.type-black {
					background-color: ${theme.colors.black};
					color: ${theme.colors.white};
				}

				&.type-white {
					background-color: ${theme.colors.white};
					color: ${theme.colors.black};
				}

				&:hover {
					z-index: 2;
				}

				&.selected {
					z-index: 1;
					outline: 1px solid ${theme.colors.green};
				}

				${options.styles?.(theme, domElem) || ''}
			`,
		});
	}

	setOption(key, value) {
		if (key === 'type') this.removeClass(/\btype-\S+\b/).addClass(`type-${value}`);
		else super.setOption(key, value);
	}
}
