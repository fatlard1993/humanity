import { Component, styled } from '@vanilla-bean/components';

const Heading = styled(
	Component,
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
	Component,
	() => `
		display: flex;
		flex-direction: row;
		justify-content: space-between;
	`,
);

export default class Toolbar extends Component {
	static schema = {
		heading: {
			set(value) {
				this._heading.elem.textContent = value;
			},
		},
		left: {
			get default() {
				return [];
			},
			set(value) {
				this._left.empty();
				this._left.append(value);
			},
		},
		right: {
			get default() {
				return [];
			},
			set(value) {
				this._right.empty();
				this._right.append(value);
			},
		},
	};

	constructor(options = {}, ...children) {
		super(
			{
				...options,
				styles: (theme, Component) => `
					padding: 15px 15px 0 15px;
					height: 57px;
					background-color: ${theme.colors.darkest(theme.colors.gray)};

					${options.styles?.(theme, Component) || ''}
				`,
			},
			...children,
		);
	}

	build() {
		this._heading = new Heading({ appendTo: this.elem });
		this._left = new Component();
		this._right = new Component();

		new FlexContainer({ appendTo: this.elem }, this._left, this._right);
	}
}
