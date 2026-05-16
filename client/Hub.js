import { Link, Button } from 'vanilla-bean-components';

import View from './shared/View.js';
import { getGames } from './api';
import Notify from './shared/Notify.js';
import { GameList, GameListText } from './shared/GameList.js';
import GameInfoPopover from './shared/GameInfoPopover.js';

const copyToClipboard = text => {
	if (window.isSecureContext && navigator.clipboard) {
		navigator.clipboard.writeText(text);
		return true;
	}

	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.style.position = 'fixed';
	textarea.style.opacity = '0';
	document.body.appendChild(textarea);
	textarea.select();
	const ok = document.execCommand('copy');
	textarea.remove();
	return ok;
};

export default class Hub extends View {
	constructor(options, ...children) {
		super(
			{
				...options,
				toolbar: {
					heading: 'Hub',
					right: [new Link({ textContent: 'Create Game', href: '#/create', variant: 'button' })],
				},
			},
			...children,
		);

		this.options.onPointerUp = () => {
			if (this.gamePopover) this.gamePopover.elem.remove();
		};
	}

	async render() {
		super.render();

		const games = await getGames();

		if (games.response.status !== 200) {
			new Notify({ type: 'error', content: games.body?.message || games.response.statusText });
			return;
		}

		this._body.append(
			new GameList({
				items: games.body.map(({ id, name, players }) => ({
					append: [
						new GameListText({ content: name }),
						new Button({
							content: 'Share',
							onPointerPress: event => {
								event.stopPropagation();

								const copied = copyToClipboard(`${window.location.origin}/#/join/${id}`);

								new Notify({
									x: event.clientX,
									y: event.clientY,
									content: copied ? 'Copied link to clipboard!' : 'Could not copy link',
									type: copied ? 'success' : 'error',
									timeout: 1300,
								});
							},
						}),
						new Button({
							content: 'Info',
							onPointerPress: event => {
								event.stopPropagation();

								if (this.gamePopover) this.gamePopover[this.gamePopover.isOpen ? 'hide' : 'show']();
								else this.gamePopover = new GameInfoPopover({ x: event.clientX, y: event.clientY, gameId: id });
							},
						}),
						new Link({ content: 'Join', href: `#/join/${id}`, variant: 'button' }),
						new GameListText({ content: `${players.length}` }),
					],
				})),
			}),
		);
	}
}
