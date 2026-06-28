import { Component, List } from '@vanilla-bean/components';

export default class ScoreCards extends List {
	constructor(options = {}) {
		super({
			styles: ({ colors }) => `
				list-style: none;
				padding: 12px;

				& li {
					background: ${colors.black};
					border: 1px solid;
					border-radius: 6px;
					padding: 6px 24px;
					margin: 12px;
				}
			`,
			...options,
		});
	}

	build() {
		const { game } = this.options;

		if (!game?.scores) return;

		this.options.items = Object.entries(game.scores).map(([playerId, { wins, votes }]) => {
			const player = game.players.find(({ id }) => id === playerId);

			return [
				new Component(
					{
						styles: () => `
							font-size: 18px;
							padding-bottom: 6px;
							margin: 6px;
							border-bottom: 1px solid;
							text-align: center;
						`,
					},
					player?.name ?? '(left)',
				),
				new Component({}, `Votes: ${votes}`),
				new Component({}, `Wins: ${wins}`),
			];
		});
	}
}
