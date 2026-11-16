import { Button, Component, Notify, failureReason } from '@vanilla-bean/components';

import { getGame, joinGame } from '@fatlard1993/web-game-framework/client';

import { getRandomName } from './api';
import Card from './shared/Card.js';
import { go, href, paths } from './paths.js';
import Screen, { goTo, quiet } from './shared/Screen.js';
import Sheet, { Failure, Fields } from './shared/Sheet.js';

export default class Join extends Screen {
	build() {
		super.build();

		this.title('Join');
		this.loading();
		this.left(goTo('Back', href(paths.hub), { icon: 'arrow-left', variant: 'flat', addClass: ['quiet', 'start'] }));
		this.load();
	}

	async load() {
		const { gameId } = this.options;
		const game = await getGame(gameId, { invalidateAfter: 0 });

		// Only the game being gone ends the seat, and goes back to the hub
		if (game.response?.status === 404) {
			new Notify({ intent: 'danger', content: 'That game is gone' });
			localStorage.removeItem(gameId);
			go(paths.hub);

			return;
		}
		// A load that failed leaves the seat to rejoin later, and says why here with Try again
		if (game.response?.status !== 200) {
			this.failed("Couldn't open the game", game, () => this.load());

			return;
		}

		// Already at the table: back to their seat
		if (game.body.players.some(({ id }) => id === localStorage.getItem(gameId))) {
			go(paths.play, { gameId });

			return;
		}

		const { name: gameName, players } = game.body;

		this.body.empty();
		this.title(gameName, 'Take a seat');

		this.form = new Fields({
			data: { name: localStorage.getItem('lastName') || '' },
			inputs: [
				{
					key: 'name',
					label: { label: 'Your name', addClass: 'beside' },
					placeholder: 'What they call you',
					attributes: { maxlength: 40, enterkeyhint: 'go' },
					validate: value => (value.trim() ? undefined : 'You need a name to sit down'),
				},
			],
		});

		const name = this.form.inputElements.name;

		name.elem.addEventListener('keydown', event => {
			if (event.key === 'Enter') this.join();
		});
		// The dice beside the name, after it
		name.elem.after(
			quiet('', () => this.randomName(), {
				icon: 'dice',
				attributes: { 'aria-label': 'Pick a random name', title: 'Pick a random name' },
			}).elem,
		);

		new Sheet(
			{ appendTo: this.body },
			new Card({ type: 'black', style: { transform: 'rotate(-2deg)' }, textContent: gameName }),
			new Component({
				addClass: 'at-table',
				textContent:
					players.length === 0
						? 'Nobody at the table yet. Be the first.'
						: `At the table: ${players.map(player => player.name).join(', ')}`,
			}),
			this.form,
		);

		this.failure = new Failure();
		this.actions(
			this.failure,
			new Button({ content: 'Take a seat', addClass: 'go', onPointerPress: () => this.join() }),
			goTo('Just watch', href(paths.watch, { gameId }), { variant: 'flat', addClass: 'quiet' }),
		);

		if (!name.options.value) name.elem.focus();
	}

	async randomName() {
		const result = await getRandomName();

		if (result.status === 'success') this.form.options.data.name = result.body;
		else new Notify({ intent: 'danger', content: `Couldn't pick a random name: ${failureReason(result)}` });
	}

	async join() {
		const { gameId } = this.options;

		if (this.form.hasErrors()) {
			this.form.inputElements.name.elem.focus();

			return;
		}

		this.failure.elem.textContent = '';

		const name = this.form.options.data.name.trim();
		const joined = await joinGame(gameId, { body: { name, playerId: localStorage.getItem(gameId) } });

		if (!this.elem.isConnected) return;
		if (joined.status !== 'success') {
			this.failure.elem.textContent = `Couldn't take a seat: ${failureReason(joined)}`;

			return;
		}

		localStorage.setItem(gameId, joined.body.id);
		localStorage.setItem('lastName', joined.body.name);

		go(paths.play, { gameId });
	}
}
