import { DomElem, Link, Button } from 'vanilla-bean-components';

import { randInt } from '../../utils/rand';
import { View } from '../layout';
import { getGame } from '../api/game';
import Notify from '../shared/Notify';
import Card, { Hand } from '../shared/Card';
import ScoreDialog from '../shared/ScoreDialog';
import QRCode from '../shared/QRCode';
import PlayersDialog from './PlayersDialog';

export default class Watch extends View {
	async render() {
		super.render();

		const game = await getGame(this.options.gameId);

		if (game.response.status !== 200) {
			new Notify({ type: 'error', content: game.body?.message || game.response.statusText });
			window.location.href = `#/hub`;
			return;
		}

		this.game = game.body;

		this._toolbar.options.heading = this.game.name;
		this._toolbar.options.left = [
			new QRCode({
				src: `${this.game.url}/#/join/${this.options.gameId}`,
				style: { margin: '-12px 12px -24px -12px' },
				qrCodeConfig: { width: 70 },
			}),
			new Link({ textContent: 'Exit', href: '#/hub' }),
		];

		this[`render_${this.game.stage === 'end' ? 'end' : 'play'}`]();
	}

	render_play() {
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

							if (selectedCard?._domElem) selectedCard._domElem.options.toggleSelection.call(selectedCard._domElem);
							if (!selectedCard || selectedCard !== this.elem) this.options.toggleSelection.call(this);

							submissions.options.selectedCard = submissions.elem.querySelector('.selected') ? this : undefined;
						},
					}),
			),
		});

		// TODO display this if the screen is "large"
		// new ReadyOrNot({ appendTo: this._body, game: this.game });

		this._toolbar.options.right = [
			new Button({ onPointerPress: () => new PlayersDialog({ game: this.game }) }, 'Show Players'),
		];
	}

	render_end() {
		this._toolbar.options.heading = 'Round Over';
		this._toolbar.options.right = [];

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

		// TODO display this if the screen is "large"
		// new ScoreCards({ game, appendTo: this._body });
	}
}
