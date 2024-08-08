import { Link, Button, copyToClipboard } from 'vanilla-bean-components';

import { View } from '../layout';
import { getGames } from '../api';
import Notify from '../shared/Notify';
import { GameList, GameListText } from './GameList';
import GameInfoPopover from './GameInfoPopover';

export default class Hub extends View {
	constructor(options, ...children) {
		super(
			{ ...options, toolbar: { heading: 'Hub', right: [new Link({ textContent: 'Create Game', href: '#/create' })] } },
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
					onPointerPress: event => {
						event.stopPropagation();

						if (this.gamePopover) this.gamePopover.elem.remove();

						this.gamePopover = new GameInfoPopover({ x: event.clientX, y: event.clientY, gameId: id });
					},
					append: [
						new GameListText({ content: name }),
						new Button({
							content: 'Share',
							onPointerPress: event => {
								event.stopPropagation();

								copyToClipboard(`${window.location.origin}#/join/${id}`);

								new Notify({
									x: event.clientX,
									y: event.clientY,
									content: 'Copied link to clipboard!',
									type: 'success',
									timeout: 1300,
								});
							},
						}),
						new Link({ content: 'Join', href: `#/join/${id}` }),
						new GameListText({ content: `${players.length}` }),
					],
				})),
			}),
		);
	}
}
