import { Notify as BaseNotify, randInt } from '@vanilla-bean/components';

export default class Notify extends BaseNotify {
	constructor(options) {
		super({
			x: randInt(12, document.body.clientWidth - 12),
			y: randInt(18, 72),
			...options,
		});
	}
}
