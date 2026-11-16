import {
	Button,
	Component,
	Notify,
	failureReason,
	runValidators,
	showFieldError,
	styled,
} from '@vanilla-bean/components';

import { createGame } from '@fatlard1993/web-game-framework/client';

import { getPacks, getRandomName } from './api';
import { go, href, paths } from './paths.js';
import Screen, { goTo, quiet } from './shared/Screen.js';
import Sheet, { Failure, Fields } from './shared/Sheet.js';

const LAST_PACKS = 'humanity.packs';
const LAST_HAND = 'humanity.handSize';
const MIN_HAND = 2;
const MAX_HAND = 30;

// The packs to deal from: a chip for each, pressed while it's picked, with Pick all and Pick none on the caption's line.
// Its value is the names picked
class PackPicker extends styled(
	Component,
	() => `
		/* Laid on its field's grid: the tools on the caption's row, the chips under both */
		display: grid;
		grid-template-columns: subgrid;
		grid-template-rows: subgrid;
		grid-column: 1 / -1;
		grid-row: 1 / span 2;

		& > .tools {
			grid-column: 2;
			grid-row: 1;
			display: flex;
			gap: 8px;
		}

		& > .chips {
			grid-column: 1 / -1;
			grid-row: 2;
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}

		& .vbc-button.pack {
			display: flex;
			align-items: baseline;
			gap: 8px;
			padding: 9px 13px;
			border: 0;
			border-radius: 9px;
			background: transparent;
			color: var(--paper);
			box-shadow: inset 0 0 0 1.5px var(--rule-strong);
			font: inherit;
			font-weight: 700;
			letter-spacing: -0.01em;
			cursor: pointer;
			transition: background-color 0.12s, color 0.12s;

			& small {
				font-size: 0.75rem;
				font-variant-numeric: tabular-nums;
				opacity: 0.6;
			}

			&:hover {
				background: rgb(243 240 231 / 0.1);
			}

			/* In the deck, a pack is a white card */
			&[aria-pressed='true'] {
				background: var(--paper);
				color: var(--ink);
				box-shadow: 0 2px 0 rgb(0 0 0 / 0.55);
			}
		}
	`,
	{ attributes: { role: 'group' } },
) {
	static schema = {
		value: {
			set(value) {
				this._show(value);
			},
		},
		// The packs there are: { name, blacks, whites }
		packs: { data: true },
	};

	build() {
		super.build?.();

		const names = () => this.options.packs.map(({ name }) => name);

		this.append(
			new Component(
				{ addClass: 'tools' },
				quiet('Pick all', () => this._change(names()), { size: 'small' }),
				quiet('Pick none', () => this._change([]), { size: 'small' }),
			),
		);

		this.chips = this.options.packs.map(
			({ name, blacks, whites }) =>
				new Button(
					{
						variant: 'chip',
						addClass: 'pack',
						attributes: { title: `${blacks.toLocaleString()} black, ${whites.toLocaleString()} white` },
						onPointerPress: () => {
							const picked = this.picked();

							this._change(picked.includes(name) ? picked.filter(each => each !== name) : [...picked, name]);
						},
					},
					name,
					new Component({ tag: 'small', textContent: (blacks + whites).toLocaleString() }),
				),
		);

		this.append(new Component({ addClass: 'chips', append: this.chips }));
		this._show(this.options.value);
	}

	picked() {
		return [...(this.options.value ?? [])];
	}

	// Checks its own picks and shows what's wrong under itself, as the form's other fields do; true when something is
	validate() {
		const messages = runValidators(this.options.validate, this.options.value);

		showFieldError({ owner: this, messages });

		return messages.length > 0;
	}

	// A pick made here is announced; a value set from outside is only shown
	_change(value) {
		this.options.value = value;
		this.emit('change', { value: [...value] });
	}

	_show(value = []) {
		this.options.packs?.forEach(({ name }, index) => {
			if (this.chips?.[index]) this.chips[index].options.pressed = value.includes(name);
		});
	}
}

// How many cards each player holds: fewer and more, between the least and most a hand can be. Its value is the number
class HandSize extends styled(
	Component,
	() => `
		display: inline-flex;
		align-items: center;
		gap: 8px;

		& .value {
			min-width: 2.4ch;
			text-align: center;
			font-size: 1.5rem;
			font-weight: 800;
			font-variant-numeric: tabular-nums;
		}

		& .unit {
			margin-left: 6px;
			color: var(--muted);
			font-weight: 600;
		}
	`,
	{ attributes: { role: 'group' } },
) {
	static schema = {
		value: {
			set(value) {
				this._show(value);
			},
		},
	};

	build() {
		super.build?.();

		this.count = new Component({ addClass: 'value', attributes: { 'aria-live': 'polite' } });
		this.fewer = quiet('', () => this._step(-1), {
			icon: 'minus',
			attributes: { 'aria-label': 'Make the hand smaller' },
		});
		this.more = quiet('', () => this._step(1), { icon: 'plus', attributes: { 'aria-label': 'Make the hand bigger' } });

		this.append(this.fewer, this.count, this.more, new Component({ addClass: 'unit', textContent: 'cards each' }));
		this._show(this.options.value);
	}

	_step(by) {
		const size = Math.min(MAX_HAND, Math.max(MIN_HAND, this.options.value + by));

		if (size === this.options.value) return;

		this.options.value = size;
		this.emit('change', { value: size });
	}

	_show(size) {
		if (!this.count) return;

		this.count.elem.textContent = size;
		this.fewer.options.disabled = size <= MIN_HAND;
		this.more.options.disabled = size >= MAX_HAND;
	}
}

const remembered = (key, fallback) => {
	try {
		return JSON.parse(localStorage.getItem(key)) ?? fallback;
	} catch {
		return fallback;
	}
};

export default class Create extends Screen {
	build() {
		super.build();

		this.title('New game', 'Build the deck');
		this.loading();
		this.left(goTo('Back', href(paths.hub), { icon: 'arrow-left', variant: 'flat', addClass: ['quiet', 'start'] }));
		this.load();
	}

	async load() {
		const packs = await getPacks();

		if (!this.elem.isConnected) return;
		if (packs.response?.status !== 200) {
			// A failure is cached as an answer would be; Try again asks again
			packs.invalidateCache?.();
			this.failed("Couldn't load the packs", packs, () => this.load());

			return;
		}

		this.body.empty();

		this.packs = packs.body;

		const has = name => this.packs.some(pack => pack.name === name);

		this.form = new Fields({
			data: {
				name: '',
				// The hand and the packs played with last time, or ten cards from the base pack; a pack since removed is
				// forgotten
				handSize: Math.min(MAX_HAND, Math.max(MIN_HAND, Number(remembered(LAST_HAND, 10)) || 10)),
				packs: remembered(LAST_PACKS, ['base']).filter(has),
			},
			inputs: [
				{
					key: 'name',
					label: { label: 'Room name', addClass: 'beside' },
					placeholder: 'What the room is called',
					attributes: { maxlength: 60, enterkeyhint: 'done' },
					validate: value => (value.trim() ? undefined : 'Name the room'),
				},
				{ key: 'handSize', label: 'Hand', InputComponent: HandSize },
				{
					key: 'packs',
					label: { label: 'Packs', addClass: 'with-tools' },
					InputComponent: PackPicker,
					packs: this.packs,
					validate: picked => this.problemWith(picked),
					// The picker checks itself as the picks change; the deck's sum follows them
					onChange: () => this.refresh(),
				},
			],
		});

		// The dice beside the name, after it
		this.form.inputElements.name.elem.after(
			quiet('', () => this.randomName({ asked: true }), {
				icon: 'dice',
				attributes: { 'aria-label': 'Pick a random name', title: 'Pick a random name' },
			}).elem,
		);

		new Sheet({ appendTo: this.body, style: { maxWidth: '720px', alignItems: 'stretch' } }, this.form);

		this.failure = new Failure();
		this.deal = new Button({ content: 'Deal the cards', addClass: 'go', onPointerPress: () => this.create() });
		this.note = new Component({ addClass: 'note' });
		this.actions(this.failure, this.deal, this.note);

		this.randomName();
		this.refresh();
	}

	// A name for the room: one to start with, or another when the dice are pressed (and said when it can't be had)
	async randomName({ asked = false } = {}) {
		const result = await getRandomName();

		if (!this.form?.elem.isConnected) return;
		if (result.status !== 'success') {
			if (asked) new Notify({ intent: 'danger', content: `Couldn't pick a random name: ${failureReason(result)}` });

			return;
		}

		this.form.options.data.name = result.body;
	}

	// The packs picked, added up
	deck(picked) {
		const packs = this.packs.filter(({ name }) => picked.includes(name));

		return {
			count: packs.length,
			blacks: packs.reduce((sum, pack) => sum + pack.blacks, 0),
			whites: packs.reduce((sum, pack) => sum + pack.whites, 0),
		};
	}

	// What's wrong with the packs picked, if anything
	problemWith(picked) {
		const { count, blacks, whites } = this.deck(picked);

		if (count === 0) return 'Pick at least one pack';
		if (blacks === 0 || whites === 0) return 'These packs need both black and white cards';
	}

	// What the deck comes to
	refresh() {
		const { count, blacks, whites } = this.deck([...this.form.options.data.packs]);

		this.note.elem.textContent = `${count} ${count === 1 ? 'pack' : 'packs'}: ${blacks.toLocaleString()} black, ${whites.toLocaleString()} white`;
	}

	async create() {
		if (this.form.hasErrors()) {
			this.form.elem.querySelector('input[aria-invalid="true"]')?.focus();

			return;
		}

		const { name, handSize } = this.form.options.data;
		const packs = [...this.form.options.data.packs];

		this.failure.elem.textContent = '';

		const created = await createGame({ body: { name: name.trim(), handSize, packs } });

		if (!this.elem.isConnected) return;
		if (created.status !== 'success') {
			this.failure.elem.textContent = `Couldn't create the game: ${failureReason(created)}`;

			return;
		}

		localStorage.setItem(LAST_PACKS, JSON.stringify(packs));
		localStorage.setItem(LAST_HAND, JSON.stringify(handSize));

		go(paths.join, { gameId: created.body.id });
	}
}
