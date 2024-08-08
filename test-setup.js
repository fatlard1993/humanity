/// <reference lib="dom" />

import { beforeEach, mock, spyOn, expect, setSystemTime } from 'bun:test';

import * as matchers from '@testing-library/jest-dom/matchers';

import { GlobalRegistrator } from '@happy-dom/global-registrator';

// expose mock
// - wasn't available otherwise and importing in the test files that need mocks breaks the rest of the file
global.mock = mock;
global.spyOn = spyOn;
global.setSystemTime = setSystemTime;

GlobalRegistrator.register({ width: 1920, height: 1080 });

// Expose EventTarget for Context
global.EventTarget = (await import('happy-dom')).EventTarget;

expect.extend(matchers);

// happy dom doesn't support popovers yet
HTMLElement.prototype.showPopover = function () {
	this.style.display = 'block';
};
HTMLElement.prototype.hidePopover = function () {
	this.style.display = 'none';
};

// happy dom doesn't support dialogs yet
HTMLDialogElement.prototype.show = function () {
	this.open = true;
	this.style.display = 'block';
};
HTMLDialogElement.prototype.showModal = function () {
	this.open = true;
	this.style.display = 'block';
};
HTMLDialogElement.prototype.close = function () {
	this.open = false;
	this.style.display = 'none';
};

// happy dom doesn't support canvas yet
HTMLCanvasElement.prototype.getContext = function () {
	return {
		closePath: () => {},
		lineTo: () => {},
		clearRect: () => {},
	};
};

global.container = document.body;

beforeEach(() => {
	mock.restore();
	document.body.replaceChildren();
});
