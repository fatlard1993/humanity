import { DomElem, Dialog, Button, Input, Label } from 'vanilla-bean-components';

import { randInt } from '../../utils/rand';
import { View } from '../layout';
import { exitGame, getGame, joinGame, selectCard } from '../api/game';
import Notify from '../shared/Notify';
import Card, { Hand } from '../shared/Card';
import { ReadyOrNot } from '../shared/WaitingPlayerList';
import ScoreDialog from '../shared/ScoreDialog';
import { onMessage } from '../socket';

export default class Play extends View {
	constructor(options, ...children) {
		super(
			{
				...options,
				toolbar: {
					left: [
						new Button({
							content: 'Exit',
							onPointerPress: () => {
								this.options.removePlayerOnExit = true;

								new Dialog({
									size: 'small',
									style: { height: '144px' },
									header: 'Exiting',
									body: new Label(
										{
											label: 'Remove me from the game',
											inline: { after: true },
											styles: () => `
												bottom: 48px;
												position: absolute;
												width: calc(100% - 60px);
											`,
										},
										new Input({
											type: 'checkbox',
											value: true,
											onChange: ({ value }) => {
												this.options.removePlayerOnExit = value;
											},
										}),
									),
									buttons: ['Exit', 'Cancel'],
									onButtonPress: async ({ button, closeDialog }) => {
										if (button === 'Exit' && this.options.removePlayerOnExit) {
											const { response, body } = await exitGame({
												gameId: this.options.gameId,
												playerId: this.playerId,
											});

											if (response.status !== 200) {
												new Notify({ type: 'error', content: body?.message || response.statusText });
											}
										}
										window.location.href = `#/hub`;

										closeDialog();
									},
								});
							},
						}),
					],
				},
			},
			...children,
		);
	}

	async render() {
		super.render();

		this.playerId = localStorage.getItem(this.options.gameId);

		if (!this.playerId) {
			window.location.href = `#/join/${this.options.gameId}`;

			return;
		}

		this.options.game = await getGame(this.options.gameId, {
			onRefetch: () => {
				this.elem.remove();
				this.render();
			},
		});

		const socketCleanup = onMessage(data => {
			if (data.gameId === this.options.gameId) {
				// TODO smarter change handling
				window.location.reload();
			}
		});

		this.options.onDisconnected = () => {
			this.options.game.unsubscribe();
			socketCleanup();
		};

		if (this.options.game.response.status !== 200) {
			new Notify({ type: 'error', content: this.options.game.body?.message || this.options.game.response.statusText });
			window.location.href = `#/hub`;
			return;
		}

		this.game = this.options.game.body;
		this.player = this.game.players.find(({ id }) => id === this.playerId);

		if (!this.player) {
			window.location.href = `#/join/${this.options.gameId}`;
			return;
		}

		this.stage = this.player.stage !== this.game.stage ? 'wait' : this.player.stage;

		this[`render_${this.stage}`]();
	}

	render_wait() {
		this._toolbar.options.heading = 'Waiting';
		this._toolbar.options.right = [];

		new ReadyOrNot({
			appendTo: this._body,
			game: this.game,
			playerId: this.playerId,
			styles: () => `
				margin: 12px 0 12px 12px;
				padding-right: 12px;
			`,
		});
	}

	render_play() {
		this._toolbar.options.heading = 'Play Your Card';

		new Card({
			type: 'black',
			style: {
				margin: '0 auto',
				transform: `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`,
			},
			content: this.game.black,
			appendTo: this._body,
		});

		const hand = new Hand({
			styles: () => `
				@media only screen and (min-width: 1px) {
					transform: unset;
				}

				@media only screen and (min-width: 310px) {
					transform: scale(0.5) translate(-50%, -50%);
					width: 200%;
				}

				@media only screen and (min-width: 520px) {
					transform: unset;
					width: 100%;
				}
			`,
			appendTo: this._body,
			append: this.player.cards.map(
				(content, index) =>
					new Card({
						type: 'white',
						style: {
							marginTop: '-102px',
							marginLeft: '-40px',
							transform: `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`,
						},
						content,
						toggleSelection: function () {
							const isSelected = this.hasClass('selected');
							this.elem.style.transform = isSelected
								? `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`
								: 'rotate(' + randInt(-33, 33) + 'deg)';
							this[isSelected ? 'removeClass' : 'addClass']('selected');
						},
						onPointerPress: function () {
							const selectedCard = hand.elem.querySelector('.selected');

							if (selectedCard?._domElem) selectedCard._domElem.options.toggleSelection.call(selectedCard._domElem);
							if (!selectedCard || selectedCard !== this.elem) this.options.toggleSelection.call(this);

							hand.options.selectedCard = hand.elem.querySelector('.selected') ? this : undefined;
						},
					}),
			),
		});

		this._toolbar.options.right = [
			new Button({
				content: 'Play',
				disabled: hand.options.subscriber('selectedCard', _ => !_),
				onPointerPress: () =>
					selectCard({
						gameId: this.options.gameId,
						playerId: this.playerId,
						selectedCard: hand.options.selectedCard.options.content,
					}),
			}),
		];
	}

	render_vote() {
		this._toolbar.options.heading = 'Place Your Vote';

		new Card({
			type: 'black',
			style: {
				margin: '0 auto',
				transform: `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`,
			},
			content: this.game.black,
			appendTo: this._body,
		});

		const submissions = new Hand({
			styles: () => `
				background-color: red;
			`,
			appendTo: this._body,
			append: this.game.submissions
				.filter(({ playerId }) => playerId !== this.playerId)
				.map(
					({ card: content }, index) =>
						new Card({
							type: 'white',
							style: {
								marginTop: '-102px',
								marginLeft: '-40px',
								transform: `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`,
							},
							content,
							toggleSelection: function () {
								const isSelected = this.hasClass('selected');
								this.elem.style.transform = isSelected
									? `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`
									: 'rotate(' + randInt(-33, 33) + 'deg)';
								this[isSelected ? 'removeClass' : 'addClass']('selected');
							},
							onPointerPress: function () {
								const selectedCard = submissions.elem.querySelector('.selected');

								if (selectedCard?._domElem) selectedCard._domElem.options.toggleSelection.call(selectedCard._domElem);
								if (!selectedCard || selectedCard !== this.elem) this.options.toggleSelection.call(this);

								submissions.options.selectedCard = submissions.elem.querySelector('.selected') ? this : undefined;
							},
						}),
				),
		});

		this._toolbar.options.right = [
			new Button({
				content: 'Vote',
				disabled: submissions.options.subscriber('selectedCard', _ => !_),
				onPointerPress: () =>
					selectCard({
						gameId: this.options.gameId,
						playerId: this.playerId,
						selectedCard: submissions.options.selectedCard.options.content,
					}),
			}),
		];
	}

	render_end() {
		this._toolbar.options.heading = 'Round Over';
		this._toolbar.options.right = [
			new Button({
				content: 'Play Again',
				onPointerPress: () => joinGame(this.options.gameId, { body: { playerId: this.playerId } }),
			}),
		];

		new DomElem(
			{
				styles: ({ colors }) => `
					background: ${colors.black};
					padding: 12px 24px;
					margin-bottom: 12px;
				`,
				appendTo: this._body,
			},
			new DomElem(
				{
					styles: () => `
						border-bottom: 1px solid;
						display: flex;
						padding-bottom: 12px;
						margin-bottom: 12px;
					`,
					appendTo: this._body,
				},
				new DomElem(
					{ style: { flex: 1, fontSize: '30px' } },
					`Winner: ${this.game.players.find(({ id }) => id === this.game.lastRoundWinner.playerId).name}`,
				),
				new Button({ onPointerPress: () => new ScoreDialog({ game: this.game }) }, 'Show Scores'),
			),
			new DomElem({}, `Votes: ${this.game.lastRoundWinner.votes}`),
			new DomElem({}, `Wins: ${this.game.scores[this.game.lastRoundWinner.playerId].wins}`),
		);

		new Card({
			type: 'black',
			style: {
				margin: '0 auto',
				transform: `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`,
			},
			content: this.game.black,
			appendTo: this._body,
		});

		new Card({
			type: 'white',
			style: {
				margin: '0 auto',
				transform: `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`,
			},
			content: this.game.lastRoundWinner.card,
			appendTo: this._body,
		});
	}
}
