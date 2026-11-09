import { Button, randInt, Notify, vibrate } from '@vanilla-bean/components';

import { act, enterGame } from '@fatlard1993/web-game-framework/client';
import { ExitDialog } from '@fatlard1993/web-game-framework/ui/GameRoom';
import { View } from '@fatlard1993/web-game-framework/ui/layout';
import Card, { Hand } from './shared/Card.js';
import { ReadyOrNot } from './shared/WaitingPlayerList.js';
import RoundWinner from './shared/RoundWinner.js';

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
		const { gameId } = this.options;
		const { playerId, leave } = await enterGame(gameId, {
			onState: view => this.show(view),
			onUpdate: message => {
				if (message.update === 'poke' && message.targetPlayerId === this.playerId) {
					vibrate([200, 100, 200]);
					new Notify({ content: 'Hey! Ready up!', intent: 'success', timeout: 2500 });
				}
			},
			notMember: () => (window.location.href = `#/join/${gameId}`),
			gone: () => {
				new Notify({ intent: 'danger', content: 'That game is gone' });
				window.location.href = '#/hub';
			},
		});

		this.playerId = playerId;
		this.addCleanup('game', leave);
		// Left before the game opened
		if (!this.elem.isConnected) leave();
	}

	// Each view of the game the server sends: the screen is drawn again only when what it shows has changed, so a card
	// picked and raised stays raised while others play
	show(view) {
		const player = view.players.find(({ id }) => id === this.playerId);

		if (!player) {
			window.location.href = `#/join/${this.options.gameId}`;
			return;
		}

		this.game = view;
		this.player = player;
		this.stage = player.stage !== view.stage ? 'wait' : player.stage;

		const drawn = JSON.stringify(this.drawnFrom());

		if (drawn === this._drawn) return;
		this._drawn = drawn;

		this._body.empty();
		this._toolbar.options.right = [];
		this[`render_${this.stage}`]();
	}

	// What the current screen shows, to tell whether a new view changes it
	drawnFrom() {
		const { name, black, players, submissions, lastRoundWinner, scores } = this.game;

		if (this.stage === 'wait') return [this.stage, name, players.map(({ id, name, stage }) => [id, name, stage])];
		if (this.stage === 'play') return [this.stage, name, black, this.player.cards];
		if (this.stage === 'vote') return [this.stage, name, black, submissions];

		return [this.stage, name, black, lastRoundWinner, scores, players.map(({ id, name }) => [id, name])];
	}

	render_wait() {
		this._toolbar.options.heading = `${this.game.name} - Waiting`;
		this._toolbar.options.right = [];

		try {
			new ReadyOrNot({
				appendTo: this._body,
				game: this.game,
				playerId: this.playerId,
				styles: ({ space }) => `
					margin: ${space.md} 0 ${space.md} ${space.md};
					padding-right: ${space.md};
				`,
			});
		} catch (error) {
			console.error('Error creating ReadyOrNot:', error);
			new Notify({ intent: 'danger', content: 'Error rendering waiting screen: ' + error.message });
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
			onPointerPress: () => act('play', { card: hand.options.selectedCard.options.innerHTML }),
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
			onPointerPress: () => act('vote', { card: submissions.options.selectedCard.options.innerHTML }),
		});

		this._toolbar.options.right = [voteButton];
	}

	render_end() {
		this._toolbar.options.heading = `${this.game.name} - Round Over`;

		const playAgainButton = new Button({
			content: 'Play Again',
			onPointerPress: () => act('ready'),
		});

		this._toolbar.options.right = [playAgainButton];

		new RoundWinner({ game: this.game, appendTo: this._body });
	}
}
