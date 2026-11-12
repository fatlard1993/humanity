import { Button, Component, Input, Notify, failureReason } from '@vanilla-bean/components';

import { getGame, joinGame } from '@fatlard1993/web-game-framework/client';

import { getRandomName } from './api';
import Card from './shared/Card.js';
import { go, href, paths } from './paths.js';
import Screen, { goTo, quiet } from './shared/Screen.js';
import Sheet from './shared/Sheet.js';

export default class Join extends Screen {
	build() {
		super.build();

		this.title('Join');
		this.left(goTo('Back', href(paths.hub), { icon: 'arrow-left', variant: 'flat', addClass: ['quiet', 'start'] }));
		this.load();
	}

	async load() {
		const { gameId } = this.options;
		const game = await getGame(gameId, { invalidateAfter: 0 });

		if (game.response?.status !== 200) {
			new Notify({
				intent: 'danger',
				content: game.response?.status === 404 ? 'That game is gone' : `Couldn't open the game: ${failureReason(game)}`,
			});
			localStorage.removeItem(gameId);
			go(paths.hub);

			return;
		}

		// Already at the table: back to their seat
		if (game.body.players.some(({ id }) => id === localStorage.getItem(gameId))) {
			go(paths.play, { gameId });

			return;
		}

		const { name, players } = game.body;

		this.title(name, 'Take a seat');

		this.name = new Input({
			value: localStorage.getItem('lastName') || '',
			placeholder: 'What they call you',
			attributes: { id: 'player-name', maxlength: 40, enterkeyhint: 'go' },
			validate: value => (value.trim() ? undefined : 'You need a name to sit down'),
		});
		this.name.elem.addEventListener('keydown', event => {
			if (event.key === 'Enter') this.join();
		});

		new Sheet(
			{ appendTo: this.body },
			new Card({ type: 'black', style: { transform: 'rotate(-2deg)' }, textContent: name }),
			new Component({
				addClass: 'at-table',
				textContent:
					players.length === 0
						? 'Nobody at the table yet. Be the first.'
						: `At the table: ${players.map(player => player.name).join(', ')}`,
			}),
			new Component(
				{ addClass: 'field' },
				new Component({ tag: 'label', textContent: 'Your name', attributes: { for: 'player-name' } }),
				new Component(
					{ addClass: 'row' },
					this.name,
					quiet('', () => this.randomName(), {
						icon: 'dice',
						attributes: { 'aria-label': 'A random name', title: 'A random name' },
					}),
				),
			),
		);

		this.actions(
			new Button({ content: 'Take a seat', addClass: 'go', onPointerPress: () => this.join() }),
			goTo('Just watch', href(paths.watch, { gameId }), { variant: 'flat', addClass: 'quiet' }),
		);

		if (!this.name.options.value) this.name.elem.focus();
	}

	async randomName() {
		const result = await getRandomName();

		if (result.status === 'success') this.name.options.value = result.body;
		else new Notify({ intent: 'danger', content: `Couldn't pick a random name: ${failureReason(result)}` });
	}

	async join() {
		const { gameId } = this.options;
		if (this.name.validate()) {
			this.name.elem.focus();

			return;
		}

		const name = this.name.options.value.trim();

		const joined = await joinGame(gameId, { body: { name, playerId: localStorage.getItem(gameId) } });

		if (joined.status !== 'success') {
			new Notify({ intent: 'danger', content: `Couldn't take a seat: ${failureReason(joined)}` });

			return;
		}

		localStorage.setItem(gameId, joined.body.id);
		localStorage.setItem('lastName', joined.body.name);

		go(paths.play, { gameId });
	}
}
