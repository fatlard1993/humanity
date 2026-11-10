import { Dialog } from '@vanilla-bean/components';

import Scoreboard from './Scoreboard.js';

export default class ScoreDialog extends Dialog {
	constructor(options = {}) {
		super({
			size: 'fit',
			header: `${options.game.name}: the standings`,
			buttons: ['Close'],
			onButtonPress: ({ closeDialog }) => closeDialog(),
			...options,
		});
	}

	build() {
		super.build();

		new Scoreboard({ game: this.options.game, playerId: this.options.playerId, appendTo: this.body });
	}
}
