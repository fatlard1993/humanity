import { DomElem, List } from 'vanilla-bean-components';

export default class ScoreCards extends List {
	constructor(options = {}) {
		super({
			styles: ({ colors }) => `
				list-style: none;
				padding: 12px;

				li {
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

	async render() {
		super.render();

		const { game } = this.options;

		this.options.items = Object.entries(game.scores).map(([playerId, { wins, votes }]) => [
			new DomElem(
				{
					styles: () => `
						font-size: 18px;
						padding-bottom: 6px;
						margin: 6px;
						border-bottom: 1px solid;
						text-align: center;
					`,
				},
				game.players.find(({ id }) => id === playerId).name,
			),
			new DomElem({}, `Votes: ${votes}`),
			new DomElem({}, `Wins: ${wins}`),
		]);
	}
}
