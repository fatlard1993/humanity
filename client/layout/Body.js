import { DomElem } from 'vanilla-bean-components';

export default class Body extends DomElem {
	constructor(options = {}, ...children) {
		super(
			{
				...options,
				styles: (theme, domElem) => `
					overflow: auto;
					flex: 1;

					${options.styles?.(theme, domElem) || ''}
				`,
			},
			...children,
		);
	}
}
