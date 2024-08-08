import { Dialog } from 'vanilla-bean-components';

import { ReadyOrNot } from '../shared/WaitingPlayerList';

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

	async render() {
		super.render();

		const { game } = this.options;

		new ReadyOrNot({ appendTo: this._body, game });
	}
}
