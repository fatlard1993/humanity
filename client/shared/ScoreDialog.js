import { Dialog } from 'vanilla-bean-components';
import ScoreCards from './ScoreCards';

export default class ScoreDialog extends Dialog {
	constructor(options = {}) {
		super({
			size: 'standard',
			header: options.game.name,
			buttons: ['Close'],
			onButtonPress: ({ closeDialog }) => closeDialog(),
			...options,
		});
	}

	render() {
		super.render();

		new ScoreCards({ game: this.options.game, appendTo: this._body });
	}
}
