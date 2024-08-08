import { Dialog } from 'vanilla-bean-components';
import ScoreCards from './ScoreCards';

export default class ScoreDialog extends Dialog {
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

		new ScoreCards({ game, appendTo: this._body });
	}
}
