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
				styles: ({ colors, space }) => `
					background: ${colors.black};
					padding: ${space.md} ${space.xl};
					margin-bottom: ${space.md};
				`,
				appendTo: this,
			},
			new Component(
				{
					styles: ({ colors, space }) => `
						border-bottom: 1px solid ${colors.border};
						display: flex;
						align-items: center;
						gap: ${space.sm};
						padding-bottom: ${space.md};
						margin-bottom: ${space.md};
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
