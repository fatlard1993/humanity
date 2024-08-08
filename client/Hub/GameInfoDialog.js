import { DomElem, Dialog } from 'vanilla-bean-components';

export default class GameInfoDialog extends Dialog {
	constructor(options = {}) {
		super({
			size: 'standard',
			header: options.game.name,
			buttons: ['Close', 'Join'],
			onButtonPress: ({ button }) => {
				if (button === 'Join') window.location.href = `#/join/${options.game.id}`;

				this.close();
			},
			...options,
		});
	}

	async render() {
		super.render();

		const { game } = this.options;

		new DomElem({ content: `Game ID: ${game.id}`, appendTo: this._body });
		new DomElem({ content: `Players: ${game.players.length}`, appendTo: this._body });
		new DomElem({ content: `Submission Timer: ${game.options.submissionTimer}`, appendTo: this._body });
		if (game.options.randomizeMissingSubmissions)
			new DomElem({
				style: { textIndent: '12px' },
				content: `- Randomize submissions on timeout`,
				appendTo: this._body,
			});
		new DomElem({ content: `Vote Timer: ${game.options.voteTimer}`, appendTo: this._body });
		if (game.options.randomizeMissingVotes)
			new DomElem({ style: { textIndent: '12px' }, content: `- Randomize votes on timeout`, appendTo: this._body });
		new DomElem({ content: `Hand Size: ${game.options.handSize}`, appendTo: this._body });
		new DomElem({ content: `NPCs: ${game.options.npcCount}`, appendTo: this._body });
		if (game.options.packs) {
			new DomElem({ content: 'Packs:', appendTo: this._body });
			game.options.packs.forEach(
				name => new DomElem({ style: { textIndent: '12px' }, content: `- ${name}`, appendTo: this._body }),
			);
		}
	}
}
