import process from 'process';
import { Page } from 'vanilla-bean-components';

import router from './router';

import './socket';

window.process = process;

new Page({
	styles: ({ colors }) => `
		color: ${colors.lightest(colors.gray)};
		background-color: ${colors.darker(colors.gray)};
	`,
	appendTo: document.body,
	append: router,
});
