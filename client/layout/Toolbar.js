import { DomElem, styled } from 'vanilla-bean-components';

const Heading = styled(
	DomElem,
	() => `
		font-size: 1.5em;
    margin: 0;
		position: absolute;
    left: 50%;
    transform: translateX(-50%);
	`,
	{ tag: 'h1' },
);

const FlexContainer = styled(
	DomElem,
	() => `
		display: flex;
		flex-direction: row;
		justify-content: space-between;
	`,
);

export default class Toolbar extends DomElem {
	constructor(options = {}, ...children) {
		super(
			{
				left: [],
				right: [],
				...options,
				styles: (theme, domElem) => `
					padding: 15px 15px 0 15px;
					height: 57px;
					background-color: ${theme.colors.darkest(theme.colors.gray)};

					${options.styles?.(theme, domElem) || ''}
				`,
			},
			...children,
		);
	}

	render() {
		this._heading = new Heading({ appendTo: this.elem, textContent: this.options.heading });
		this._left = new DomElem({}, ...this.options.left);
		this._right = new DomElem({}, ...this.options.right);

		new FlexContainer({ appendTo: this.elem }, this._left, this._right);

		super.render();
	}

	setOption(key, value) {
		if (key === 'heading') this._heading.elem.textContent = value;
		else if (key === 'left') {
			this._left.empty();
			this._left.append(value);
		} else if (key === 'right') {
			this._right.empty();
			this._right.append(value);
		} else super.setOption(key, value);
	}
}
