import { Page, requestWakeLock } from '@vanilla-bean/components';

import router from './router';

import '@fatlard1993/web-game-framework/client/socket';
import '@vanilla-bean/components/app/reloadOnBuild';

// The screen stays awake while the game is open
requestWakeLock();

new Page({
	styles: ({ colors }) => `
		color: ${colors.lightest(colors.gray)};
		background-color: ${colors.darker(colors.gray)};
	`,
	appendTo: document.body,
	append: router,
});
