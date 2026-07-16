import { Page } from '@vanilla-bean/components';

import router from './router';

import '@fatlard1993/web-game-framework/client/socket';

// Keep screen awake during gameplay
if ('wakeLock' in navigator) {
	let wakeLock = null;

	const requestWakeLock = async () => {
		try {
			wakeLock = await navigator.wakeLock.request('screen');
			wakeLock.addEventListener('release', () => {
				wakeLock = null;
			});
		} catch {
			// Wake lock is best-effort; unsupported browsers and denied requests are fine
		}
	};

	requestWakeLock();
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') requestWakeLock();
	});
}

new Page({
	styles: ({ colors }) => `
		color: ${colors.lightest(colors.gray)};
		background-color: ${colors.darker(colors.gray)};
	`,
	appendTo: document.body,
	append: router,
});
