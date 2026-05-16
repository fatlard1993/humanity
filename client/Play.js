import { Component, Dialog, Button, Input, Label, randInt } from 'vanilla-bean-components';

import View from './shared/View.js';
import { exitGame, getGame, joinGame, selectCard } from './api/game.js';
import Notify from './shared/Notify.js';
import Card, { Hand } from './shared/Card.js';
import { ReadyOrNot } from './shared/WaitingPlayerList.js';
import ScoreDialog from './shared/ScoreDialog.js';
import createGameRouter from './eventRouter.js';

export default class Play extends View {
	constructor(options, ...children) {
		super(
			{
				...options,
				toolbar: {
					heading: '',
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

		this.options.game = await getGame(this.options.gameId);

		const router = createGameRouter(this.options.gameId, {
			onUpdate: () => this.refresh(),
			onPoke: (data) => {
				if (data.targetPlayerId === this.playerId) {
					if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
					new Notify({ content: 'Hey! Ready up!', type: 'success', timeout: 2500 });
				}
			},
		});

		this.options.onDisconnected = () => {
			this.options.game.unsubscribe();
			router.destroy();
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

		console.log('Play render - stage:', this.stage, 'player.stage:', this.player.stage, 'game.stage:', this.game.stage);

		if (typeof this[`render_${this.stage}`] === 'function') {
			this[`render_${this.stage}`]();
		} else {
			console.error(`No render method for stage: ${this.stage}`);
			new Notify({ type: 'error', content: `Unknown game stage: ${this.stage}` });
			this._body.append(
				new Component({
					content: `Debug info: stage="${this.stage}", player.stage="${this.player.stage}", game.stage="${this.game.stage}"`,
				}),
			);
		}
	}

	async refresh() {
		if (this._refreshing) return;
		this._refreshing = true;

		try {
			this.options.game.invalidateCache();
			this.options.game = await getGame(this.options.gameId);

			if (this.options.game.response.status !== 200) {
				window.location.href = '#/hub';
				return;
			}

			this.game = this.options.game.body;
			this.player = this.game.players.find(({ id }) => id === this.playerId);

			if (!this.player) {
				window.location.href = `#/join/${this.options.gameId}`;
				return;
			}

			this.stage = this.player.stage !== this.game.stage ? 'wait' : this.player.stage;

			this._body.empty();
			this._toolbar._right.empty();
			this[`render_${this.stage}`]();
		} finally {
			this._refreshing = false;
		}
	}

	render_wait() {
		console.log('render_wait called', 'game:', this.game, 'playerId:', this.playerId);
		this._toolbar._heading.elem.textContent = `${this.game.name} - Waiting`;
		this._toolbar.options.right = [];
		this._toolbar._right.empty();

		try {
			const readyOrNot = new ReadyOrNot({
				appendTo: this._body,
				game: this.game,
				playerId: this.playerId,
				styles: () => `
					margin: 12px 0 12px 12px;
					padding-right: 12px;
				`,
			});
			console.log('ReadyOrNot created:', readyOrNot);
		} catch (error) {
			console.error('Error creating ReadyOrNot:', error);
			new Notify({ type: 'error', content: 'Error rendering waiting screen: ' + error.message });
		}
	}

	render_play() {
		this._toolbar._heading.elem.textContent = `${this.game.name} - Play Your Card`;

		new Card({
			type: 'black',
			style: {
				margin: '0 auto',
				transform: `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`,
			},
			innerHTML: this.game.black,
			appendTo: this._body,
		});

		const hand = new Hand({
			styles: () => `
				padding: 0 42px;
				box-sizing: border-box;

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
						innerHTML: content,
						toggleSelection: function () {
							const isSelected = this.hasClass('selected');
							this.elem.style.transform = isSelected
								? `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`
								: 'rotate(' + randInt(-33, 33) + 'deg)';
							this[isSelected ? 'removeClass' : 'addClass']('selected');
						},
						onPointerPress: function () {
							const isAlreadySelected = this.elem.classList.contains('selected');

							// Deselect all cards first
							hand.elem.querySelectorAll('.selected').forEach(elem => {
								elem.classList.remove('selected');
								elem.style.transform = `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`;
							});

							// If this card was already selected, leave it deselected
							if (isAlreadySelected) {
								hand.options.selectedCard = undefined;
								return;
							}

							// Select this card - move it up and toward center
							this.elem.classList.add('selected');

							// Calculate how far to move toward center (30% of the way)
							const cardRect = this.elem.getBoundingClientRect();
							const handRect = hand.elem.getBoundingClientRect();
							const cardCenter = cardRect.left + cardRect.width / 2;
							const handCenter = handRect.left + handRect.width / 2;
							const offsetToCenter = (handCenter - cardCenter) * 0.3;

							this.elem.style.transition = 'transform 0.3s ease-out';
							this.elem.style.transform = `translate(${offsetToCenter}px, -120px) rotate(${randInt(-5, 5)}deg) scale(1.1)`;

							hand.options.selectedCard = this;
						},
					}),
			),
		});

		const playButton = new Button({
			content: 'Play',
			disabled: hand.options.subscriber('selectedCard', _ => !_),
			onPointerPress: () =>
				selectCard({
					gameId: this.options.gameId,
					playerId: this.playerId,
					selectedCard: hand.options.selectedCard.options.innerHTML,
				}),
		});

		this._toolbar._right.empty();
		this._toolbar._right.append(playButton);
	}

	render_vote() {
		this._toolbar._heading.elem.textContent = `${this.game.name} - Place Your Vote`;

		new Card({
			type: 'black',
			style: {
				margin: '0 auto',
				transform: `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`,
			},
			innerHTML: this.game.black,
			appendTo: this._body,
		});

		const submissions = new Hand({
			styles: () => `
				padding: 0 42px;
				box-sizing: border-box;
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
							innerHTML: content,
							toggleSelection: function () {
								const isSelected = this.hasClass('selected');
								this.elem.style.transform = isSelected
									? `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`
									: 'rotate(' + randInt(-33, 33) + 'deg)';
								this[isSelected ? 'removeClass' : 'addClass']('selected');
							},
							onPointerPress: function () {
								const isAlreadySelected = this.elem.classList.contains('selected');

								// Deselect all cards first
								submissions.elem.querySelectorAll('.selected').forEach(elem => {
									elem.classList.remove('selected');
									elem.style.transform = `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`;
								});

								// If this card was already selected, leave it deselected
								if (isAlreadySelected) {
									submissions.options.selectedCard = undefined;
									return;
								}

								// Select this card - move it up and toward center
								this.addClass('selected');

								// Calculate how far to move toward center (30% of the way)
								const cardRect = this.elem.getBoundingClientRect();
								const submissionsRect = submissions.elem.getBoundingClientRect();
								const cardCenter = cardRect.left + cardRect.width / 2;
								const submissionsCenter = submissionsRect.left + submissionsRect.width / 2;
								const offsetToCenter = (submissionsCenter - cardCenter) * 0.3;

								this.elem.style.transition = 'transform 0.3s ease-out';
								this.elem.style.transform = `translate(${offsetToCenter}px, -120px) rotate(${randInt(-5, 5)}deg) scale(1.1)`;

								submissions.options.selectedCard = this;
							},
						}),
				),
		});

		const voteButton = new Button({
			content: 'Vote',
			disabled: submissions.options.subscriber('selectedCard', _ => !_),
			onPointerPress: () =>
				selectCard({
					gameId: this.options.gameId,
					playerId: this.playerId,
					selectedCard: submissions.options.selectedCard.options.innerHTML,
				}),
		});

		this._toolbar._right.empty();
		this._toolbar._right.append(voteButton);
	}

	render_end() {
		this._toolbar._heading.elem.textContent = `${this.game.name} - Round Over`;

		const playAgainButton = new Button({
			content: 'Play Again',
			onPointerPress: () => joinGame(this.options.gameId, { body: { playerId: this.playerId } }),
		});

		this._toolbar._right.empty();
		this._toolbar._right.append(playAgainButton);

		new Component(
			{
				styles: ({ colors }) => `
					background: ${colors.black};
					padding: 12px 24px;
					margin-bottom: 12px;
				`,
				appendTo: this._body,
			},
			new Component(
				{
					styles: () => `
						border-bottom: 1px solid;
						display: flex;
						padding-bottom: 12px;
						margin-bottom: 12px;
					`,
					appendTo: this._body,
				},
				new Component(
					{ style: { flex: 1, fontSize: '30px' } },
					`Winner: ${this.game.players.find(({ id }) => id === this.game.lastRoundWinner.playerId).name}`,
				),
				new Button({ onPointerPress: () => new ScoreDialog({ game: this.game }) }, 'Show Scores'),
			),
			new Component({}, `Votes: ${this.game.lastRoundWinner.votes}`),
			new Component({}, `Wins: ${this.game.scores[this.game.lastRoundWinner.playerId].wins}`),
		);

		new Card({
			type: 'black',
			style: {
				margin: '0 auto',
				transform: `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`,
			},
			innerHTML: this.game.black,
			appendTo: this._body,
		});

		new Card({
			type: 'white',
			style: {
				margin: '0 auto',
				transform: `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`,
			},
			innerHTML: this.game.lastRoundWinner.card,
			appendTo: this._body,
		});
	}
}
