import { DomElem, List, Label, Button, styled, conditionalList } from 'vanilla-bean-components';

import { readyUp } from '../api/game';

import Notify from './Notify';

const WaitingPlayerList = styled(
	List,
	({ colors }) => `
		padding: 0;
		overflow: visible;

		li {
			display: flex;
			margin: 6px;
			padding: 6px;
			border: 2px solid ${colors.white.setAlpha(0.4)};
			border-radius: 6px;
			list-style: none;
			text-indent: 0;

			& > button, & > a {
				margin-bottom: 0;
			}
		}
	`,
);

const WaitingPlayerListText = styled(
	DomElem,
	() => `
		font-size: 1.2em;
		line-height: 1.6;
		padding: 0 6px;
		pointer-events: none;

		&:first-of-type {
			flex: 1;
		}
	`,
);

export class ReadyOrNot extends DomElem {
	render() {
		super.render();

		const ready = [];
		const notReady = [];

		this.options.game.players.forEach(player => {
			if (player.stage !== this.options.game.stage) ready.push(player);
			else notReady.push(player);
		});

		new Label({
			label: 'Ready',
			appendTo: this,
			append: new WaitingPlayerList({
				items: ready.map(({ name }) => ({
					append: [new WaitingPlayerListText({ content: name })],
				})),
			}),
		});
		new Label({
			label: 'Not',
			appendTo: this,
			append: new WaitingPlayerList({
				items: notReady.map(({ id, name }) => ({
					append: conditionalList([
						{ alwaysItem: new WaitingPlayerListText({ content: name }) },
						{
							if: id === this.options.playerId,
							thenItem: new Button({
								content: 'Ready',
								onPointerPress: async event => {
									const ready = await readyUp({ gameId: this.options.game.id, playerId: this.options.playerId });

									if (!ready.success) return new Notify({ type: 'error', content: ready.body });

									new Notify({ x: event.clientX, y: event.clientY, content: 'Ready!', type: 'success', timeout: 1300 });
								},
							}),
							elseItems: [
								new Button({
									content: 'Poke',
									onPointerPress: event => {
										new Notify({
											x: event.clientX,
											y: event.clientY,
											content: 'Poked!',
											type: 'success',
											timeout: 1300,
										});
									},
								}),
							],
						},
					]),
				})),
			}),
		});
	}
}
