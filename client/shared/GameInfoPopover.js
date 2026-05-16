import { Component, Button, styled } from 'vanilla-bean-components';

import { getGame } from '../api/game.js';
import GameInfoDialog from './GameInfoDialog.js';

export default class GameInfoPopover extends styled.Popover`
	flex-direction: column;
` {
	async render() {
		super.render();

		const game = (await getGame(this.options.gameId)).body;

		new Component({ content: `Name: ${game.name}`, appendTo: this.elem });
		new Component({ content: `Players: ${game.players.length}`, appendTo: this.elem });
		new Component({ content: `NPCs: ${game.options.npcCount}`, appendTo: this.elem });
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
