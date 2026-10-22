import { Button, Component, randInt } from '@vanilla-bean/components';

import Card from './Card.js';
import ScoreDialog from './ScoreDialog.js';

const tossed = () => ({
	margin: '0 auto',
	transform: `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`,
});

export default class RoundWinner extends Component {
	build() {
		const { game } = this.options;
		const { playerId, votes, card } = game.lastRoundWinner;

		new Component(
			{
				styles: ({ colors }) => `
					background: ${colors.black};
					padding: 12px 24px;
					margin-bottom: 12px;
				`,
				appendTo: this,
			},
			new Component(
				{
					styles: () => `
						border-bottom: 1px solid;
						display: flex;
						padding-bottom: 12px;
						margin-bottom: 12px;
					`,
				},
				new Component(
					{ style: { flex: 1, fontSize: '30px' } },
					`Winner: ${game.players.find(({ id }) => id === playerId).name}`,
				),
				new Button({ onPointerPress: () => new ScoreDialog({ game }) }, 'Show Scores'),
			),
			new Component({}, `Votes: ${votes}`),
			new Component({}, `Wins: ${game.scores[playerId].wins}`),
		);

		new Card({ type: 'black', style: tossed(), innerHTML: game.black, appendTo: this });
		new Card({ type: 'white', style: tossed(), innerHTML: card, appendTo: this });
	}
}
