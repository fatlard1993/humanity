import { Component, Button, randInt, Notify, vibrate } from '@vanilla-bean/components';
import { failureReason } from '@vanilla-bean/hypertether';

import { ExitDialog } from '@fatlard1993/web-game-framework/ui/GameRoom';
import { View } from '@fatlard1993/web-game-framework/ui/layout';
import { getGame, joinGame, selectCard } from './api/game.js';
import Card, { Hand } from './shared/Card.js';
import { ReadyOrNot } from './shared/WaitingPlayerList.js';
import RoundWinner from './shared/RoundWinner.js';
import createGameRouter from './eventRouter.js';

// A card is 252px across its padding; on a phone two fit side by side, sized from the hand's width (less 16px for their
// tilt), with the overlap and padding in step. The resting translate takes half the overlap there so the pair sits
// centered.
const fittedHand = ({ media }) => `
	padding: 0 42px;
	box-sizing: border-box;

	@media ${media.phone} {
		container-type: inline-size;
		padding: 0 12px;

		--card-size: min(252px, calc((100cqi - 16px) / 1.84));
		--card-pad: max(10px, calc(var(--card-size) * 18 / 252));
		--overlap-x: calc(var(--card-size) * 40 / 252);
		--overlap-y: calc(var(--card-size) * 102 / 252);
		--shift-x: calc(var(--overlap-x) / 2);

		& > .type-white {
			width: calc(var(--card-size) - 2 * var(--card-pad));
			height: calc(var(--card-size) * 9 / 7 - 2 * var(--card-pad));
			padding: var(--card-pad);
			font-size: clamp(14px, calc(var(--card-size) * 16 / 252), 16px);
		}
	}
`;

const resting = 'translate(var(--shift-x, 40px), var(--overlap-y, 102px))';

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
							onPointerPress: () => new ExitDialog({ gameId: this.options.gameId, playerId: this.playerId }),
						}),
					],
				},
			},
			...children,
		);
	}

	build() {
		super.build();
		this._init();
	}

	async _init() {
		this.playerId = localStorage.getItem(this.options.gameId);

		if (!this.playerId) {
			window.location.href = `#/join/${this.options.gameId}`;

			return;
		}

		this.options.game = await getGame(this.options.gameId);

		const router = createGameRouter(this.options.gameId, {
			onUpdate: () => this.refresh(),
			onPoke: data => {
				if (data.targetPlayerId === this.playerId) {
					vibrate([200, 100, 200]);
					new Notify({ content: 'Hey! Ready up!', type: 'success', timeout: 2500 });
				}
			},
		});

		this.options.onDisconnected = () => {
			this.options.game.unsubscribe();
			router.destroy();
		};

		if (this.options.game.response.status !== 200) {
			new Notify({ type: 'error', content: failureReason(this.options.game) });
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
			this._toolbar.options.right = [];
			this[`render_${this.stage}`]();
		} finally {
			this._refreshing = false;
		}
	}

	render_wait() {
		this._toolbar.options.heading = `${this.game.name} - Waiting`;
		this._toolbar.options.right = [];

		try {
			new ReadyOrNot({
				appendTo: this._body,
				game: this.game,
				playerId: this.playerId,
				styles: () => `
					margin: 12px 0 12px 12px;
					padding-right: 12px;
				`,
			});
		} catch (error) {
			console.error('Error creating ReadyOrNot:', error);
			new Notify({ type: 'error', content: 'Error rendering waiting screen: ' + error.message });
		}
	}

	render_play() {
		this._toolbar.options.heading = `${this.game.name} - Play Your Card`;

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
			styles: fittedHand,
			appendTo: this._body,
			append: this.player.cards.map(
				(content, index) =>
					new Card({
						type: 'white',
						style: {
							marginTop: 'calc(-1 * var(--overlap-y, 102px))',
							marginLeft: 'calc(-1 * var(--overlap-x, 40px))',
							transform: `${resting} rotate(${(-5 + index) * randInt(1, 3)}deg)`,
						},
						innerHTML: content,
						toggleSelection: function () {
							const isSelected = this.hasClass('selected');
							this.elem.style.transform = isSelected
								? `${resting} rotate(${(-5 + index) * randInt(1, 3)}deg)`
								: 'rotate(' + randInt(-33, 33) + 'deg)';
							this[isSelected ? 'removeClass' : 'addClass']('selected');
						},
						onPointerPress: function () {
							const isAlreadySelected = this.elem.classList.contains('selected');

							// Deselect all cards first
							hand.elem.querySelectorAll('.selected').forEach(elem => {
								elem.classList.remove('selected');
								elem.style.transform = `${resting} rotate(${(-5 + index) * randInt(1, 3)}deg)`;
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

		this._toolbar.options.right = [playButton];
	}

	render_vote() {
		this._toolbar.options.heading = `${this.game.name} - Place Your Vote`;

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
			styles: fittedHand,
			appendTo: this._body,
			append: this.game.submissions
				.filter(({ playerId }) => playerId !== this.playerId)
				.map(
					({ card: content }, index) =>
						new Card({
							type: 'white',
							style: {
								marginTop: 'calc(-1 * var(--overlap-y, 102px))',
								marginLeft: 'calc(-1 * var(--overlap-x, 40px))',
								transform: `${resting} rotate(${(-5 + index) * randInt(1, 3)}deg)`,
							},
							innerHTML: content,
							toggleSelection: function () {
								const isSelected = this.hasClass('selected');
								this.elem.style.transform = isSelected
									? `${resting} rotate(${(-5 + index) * randInt(1, 3)}deg)`
									: 'rotate(' + randInt(-33, 33) + 'deg)';
								this[isSelected ? 'removeClass' : 'addClass']('selected');
							},
							onPointerPress: function () {
								const isAlreadySelected = this.elem.classList.contains('selected');

								// Deselect all cards first
								submissions.elem.querySelectorAll('.selected').forEach(elem => {
									elem.classList.remove('selected');
									elem.style.transform = `${resting} rotate(${(-5 + index) * randInt(1, 3)}deg)`;
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

		this._toolbar.options.right = [voteButton];
	}

	render_end() {
		this._toolbar.options.heading = `${this.game.name} - Round Over`;

		const playAgainButton = new Button({
			content: 'Play Again',
			onPointerPress: () => joinGame(this.options.gameId, { body: { playerId: this.playerId } }),
		});

		this._toolbar.options.right = [playAgainButton];

		new RoundWinner({ game: this.game, appendTo: this._body });
	}
}
