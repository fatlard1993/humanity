import { Link, Button, randInt, Notify } from '@vanilla-bean/components';

import { enterGame } from '@fatlard1993/web-game-framework/client';
import { View } from '@fatlard1993/web-game-framework/ui/layout';
import QRCode from '@fatlard1993/web-game-framework/ui/QRCode';
import Card, { Hand } from './shared/Card.js';
import RoundWinner from './shared/RoundWinner.js';
import PlayersDialog from './shared/PlayersDialog.js';

export default class Watch extends View {
	build() {
		super.build();
		this._init();
	}

	async _init() {
		const { gameId } = this.options;
		const { leave } = await enterGame(gameId, {
			watch: true,
			onState: view => this.show(view),
			gone: () => {
				new Notify({ intent: 'danger', content: 'That game is gone' });
				window.location.href = '#/hub';
			},
		});

		this.addCleanup('game', leave);
		// Left before the game opened
		if (!this.elem.isConnected) leave();
	}

	// Each view of the game the server sends, drawn again when what the screen shows has changed
	show(view) {
		const first = !this.game;
		const { name, stage, black, players, submissions, lastRoundWinner, scores } = view;
		const drawn = JSON.stringify([
			name,
			stage,
			black,
			players.map(({ id, name, stage, selectedCard }) => [id, name, stage, !!selectedCard]),
			submissions.length,
			lastRoundWinner,
			scores,
		]);

		this.game = view;

		if (first) {
			this._toolbar.options.left = [
				new QRCode({
					src: `${view.url}/#/join/${this.options.gameId}`,
					style: { margin: '-12px 12px -24px -12px' },
					qrCodeConfig: { width: 70 },
				}),
				new Link({ textContent: 'Exit', href: '#/hub', variant: 'button' }),
			];
		}

		if (drawn === this._drawn) return;
		this._drawn = drawn;

		this._body.empty();
		this._toolbar.options.right = [];
		this._toolbar.options.heading = name;
		this[`render_${stage === 'end' ? 'end' : 'play'}`]();
	}

	render_play() {
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
			appendTo: this._body,
			append: (this.game.stage === 'vote'
				? this.game.submissions
				: this.game.players.filter(({ selectedCard }) => selectedCard)
			).map(
				(content, index) =>
					new Card({
						type: 'white',
						style: {
							marginTop: '-102px',
							marginLeft: '-40px',
							transform: `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`,
						},
						toggleSelection: function () {
							const isSelected = this.hasClass('selected');
							this.elem.style.transform = isSelected
								? `translate(40px, 102px) rotate(${(-5 + index) * randInt(1, 3)}deg)`
								: 'rotate(' + randInt(-33, 33) + 'deg)';
							this[isSelected ? 'removeClass' : 'addClass']('selected');
						},
						onPointerPress: function () {
							const selectedCard = submissions.elem.querySelector('.selected');

							if (selectedCard?._Component)
								selectedCard._Component.options.toggleSelection.call(selectedCard._Component);
							if (!selectedCard || selectedCard !== this.elem) this.options.toggleSelection.call(this);

							submissions.options.selectedCard = submissions.elem.querySelector('.selected') ? this : undefined;
						},
					}),
			),
		});

		this._toolbar.options.right = [
			new Button({ onPointerPress: () => new PlayersDialog({ game: this.game }) }, 'Show Players'),
		];
	}

	render_end() {
		this._toolbar.options.heading = 'Round Over';
		this._toolbar.options.right = [];

		new RoundWinner({ game: this.game, appendTo: this._body });
	}
}
