import { Card, Component, List, Label, Button, Notify, styled, conditionalList } from '@vanilla-bean/components';

import { act } from '@fatlard1993/web-game-framework/client';

const WaitingPlayerListItem = styled(
	Card,
	({ space }) => `
		display: flex;
		align-items: center;
		gap: ${space.sm};

		& > button {
			margin: 0;
		}
	`,
);

class WaitingPlayerList extends styled(
	List,
	({ space }) => `
		display: flex;
		flex-direction: column;
		gap: ${space.sm};
		margin: ${space.sm} 0;
		padding: 0;
		overflow: visible;

		& > li {
			list-style: none;
			text-indent: 0;
			line-height: normal;
		}
	`,
) {
	static schema = {
		ListItemComponent: { default: WaitingPlayerListItem },
	};
}

const WaitingPlayerListText = styled(
	Component,
	({ space }) => `
		flex: 1;
		min-width: 0;
		font-size: 1.2em;
		line-height: 1.6;
		padding: 0 ${space.xs};
		overflow-wrap: anywhere;
		pointer-events: none;
	`,
);

export class ReadyOrNot extends Component {
	build() {
		const ready = [];
		const notReady = [];

		this.options.game.players.forEach(player => {
			// Done with this stage (readied, played, voted); someone sitting out the round (waiting) isn't
			if (player.stage !== this.options.game.stage && player.stage !== 'wait') ready.push(player);
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
									const ready = await act('ready');

									if (!ready.ok) return;

									new Notify({
										x: event.clientX,
										y: event.clientY,
										content: 'Ready!',
										intent: 'success',
										timeout: 1300,
									});
								},
							}),
							// A player pokes; someone watching has no one to poke as
							elseItems: !this.options.playerId
								? []
								: [
										new Button({
											content: 'Poke',
											onPointerPress: async event => {
												const poked = await act('poke', { targetPlayerId: id });

												if (!poked.ok) return;

												new Notify({
													x: event.clientX,
													y: event.clientY,
													content: 'Poked!',
													intent: 'success',
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
