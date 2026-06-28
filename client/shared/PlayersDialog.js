import { Dialog } from '@vanilla-bean/components';

import { ReadyOrNot } from './WaitingPlayerList.js';

export default class PlayersDialog extends Dialog {
	constructor(options = {}) {
		super({
			size: 'standard',
			header: options.game.name,
			buttons: ['Close'],
			onButtonPress: () => this.close(),
			...options,
		});
	}

	build() {
		super.build();

		new ReadyOrNot({ appendTo: this._body, game: this.options.game });
	}
}
