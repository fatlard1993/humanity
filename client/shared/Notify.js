import { Notify as BaseNotify } from 'vanilla-bean-components';
import { randInt } from '../../utils/rand';

export default class Notify extends BaseNotify {
	constructor(options) {
		super({
			x: randInt(12, document.body.clientWidth - 12),
			y: randInt(18, 72),
			...options,
		});
	}
}
