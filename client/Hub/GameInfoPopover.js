import { DomElem, Button, Popover } from 'vanilla-bean-components';

import { getGame } from '../api/game';
import GameInfoDialog from './GameInfoDialog';

export default class GameInfoPopover extends Popover {
	constructor(options) {
		super({
			...options,
			styles: (theme, domElem) => `
				${options.styles?.(theme, domElem) || ''}
			`,
		});
	}

	async render() {
		super.render();

		const game = (await getGame(this.options.gameId)).body;

		new DomElem({ content: `Name: ${game.name}`, appendTo: this.elem });
		new DomElem({ content: `Players: ${game.players.length}`, appendTo: this.elem });
		new DomElem({ content: `NPCs: ${game.options.npcCount}`, appendTo: this.elem });
		new Button({
			content: 'More',
			appendTo: this.elem,
			style: { display: 'block', margin: '6px auto' },
			onPointerPress: () => {
				this.elem.remove();

				new GameInfoDialog({ game });
			},
		});
	}
}
