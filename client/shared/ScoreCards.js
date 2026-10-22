import { Card, Component, List, styled } from '@vanilla-bean/components';

const ScoreCard = styled(
	Card,
	({ space }) => `
		display: flex;
		flex-direction: column;
		gap: ${space.xs};
	`,
);

const ScoreCardName = styled(
	Component,
	({ colors, space }) => `
		font-size: 18px;
		padding-bottom: ${space.sm};
		margin-bottom: ${space.xs};
		border-bottom: 1px solid ${colors.border};
		text-align: center;
	`,
);

export default class ScoreCards extends styled(
	List,
	({ space }) => `
		display: flex;
		flex-direction: column;
		gap: ${space.sm};
		margin: 0;
		padding: 0;

		& > li {
			list-style: none;
			text-indent: 0;
		}
	`,
) {
	static schema = {
		ListItemComponent: { default: ScoreCard },
	};

	build() {
		const { game } = this.options;

		if (!game?.scores) return;

		this.options.items = Object.entries(game.scores).map(([playerId, { wins, votes }]) => {
			const player = game.players.find(({ id }) => id === playerId);

			return {
				append: [
					new ScoreCardName({ content: player?.name ?? '(left)' }),
					new Component({ content: `Votes: ${votes}` }),
					new Component({ content: `Wins: ${wins}` }),
				],
			};
		});
	}
}
