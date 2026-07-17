import { Component } from '@vanilla-bean/components';
import { GameInfoDialog as BaseGameInfoDialog } from '@fatlard1993/web-game-framework/ui/GameRoom';

export default class GameInfoDialog extends BaseGameInfoDialog {
	build() {
		super.build();

		const { game } = this.options;

		new Component({ content: `Submission Timer: ${game.options.submissionTimer}`, appendTo: this._body });
		if (game.options.randomizeMissingSubmissions)
			new Component({
				style: { textIndent: '12px' },
				content: `- Randomize submissions on timeout`,
				appendTo: this._body,
			});
		new Component({ content: `Vote Timer: ${game.options.voteTimer}`, appendTo: this._body });
		if (game.options.randomizeMissingVotes)
			new Component({ style: { textIndent: '12px' }, content: `- Randomize votes on timeout`, appendTo: this._body });
		new Component({ content: `Hand Size: ${game.options.handSize}`, appendTo: this._body });
		new Component({ content: `NPCs: ${game.options.npcCount}`, appendTo: this._body });
		if (game.options.packs) {
			new Component({ content: 'Packs:', appendTo: this._body });
			game.options.packs.forEach(
				name => new Component({ style: { textIndent: '12px' }, content: `- ${name}`, appendTo: this._body }),
			);
		}
	}
}
