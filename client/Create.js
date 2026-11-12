import { Button, Component, Input, Notify, failureReason, styled } from '@vanilla-bean/components';

import { createGame } from '@fatlard1993/web-game-framework/client';

import { getPacks, getRandomName } from './api';
import { go, href, paths } from './paths.js';
import Screen, { goTo, quiet } from './shared/Screen.js';
import Sheet from './shared/Sheet.js';

const LAST_PACKS = 'humanity.packs';
const LAST_HAND = 'humanity.handSize';
const MIN_HAND = 2;
const MAX_HAND = 30;

const Packs = styled(
	Component,
	() => `
		display: flex;
		flex-wrap: wrap;
		gap: 8px;

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
);

const Stepper = styled(
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
);

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
		// The packs played with last time, or the base pack; a pack since removed is forgotten
		this.picked = new Set(remembered(LAST_PACKS, ['base']).filter(name => this.packs.some(pack => pack.name === name)));
		this.handSize = Math.min(MAX_HAND, Math.max(MIN_HAND, Number(remembered(LAST_HAND, 10)) || 10));

		this.name = new Input({
			placeholder: 'What the room is called',
			attributes: { id: 'room-name', maxlength: 60, enterkeyhint: 'done' },
		});
		this.name.elem.addEventListener('input', () => this.refresh());
		this.randomName();

		this.handValue = new Component({ addClass: 'value', attributes: { 'aria-live': 'polite' } });
		this.fewer = quiet('', () => this.setHand(this.handSize - 1), {
			icon: 'minus',
			attributes: { 'aria-label': 'A smaller hand' },
		});
		this.more = quiet('', () => this.setHand(this.handSize + 1), {
			icon: 'plus',
			attributes: { 'aria-label': 'A bigger hand' },
		});

		this.chips = this.packs.map(
			({ name, blacks, whites }) =>
				new Button(
					{
						variant: 'chip',
						addClass: 'pack',
						pressed: this.picked.has(name),
						attributes: { title: `${blacks.toLocaleString()} black, ${whites.toLocaleString()} white` },
						onPointerPress: () => {
							this.picked[this.picked.has(name) ? 'delete' : 'add'](name);
							this.refresh();
						},
					},
					name,
					new Component({ tag: 'small', textContent: (blacks + whites).toLocaleString() }),
				),
		);

		const all = pick => {
			this.picked = new Set(pick ? this.packs.map(({ name }) => name) : []);
			this.refresh();
		};

		new Sheet(
			{ appendTo: this.body, style: { maxWidth: '720px', alignItems: 'stretch' } },
			new Component(
				{ addClass: 'field' },
				new Component({ tag: 'label', textContent: 'Room name', attributes: { for: 'room-name' } }),
				new Component(
					{ addClass: 'row' },
					this.name,
					quiet('', () => this.randomName({ asked: true }), {
						icon: 'dice',
						attributes: { 'aria-label': 'A random name', title: 'A random name' },
					}),
				),
			),
			new Component(
				{ addClass: 'field' },
				new Component({ addClass: 'label', textContent: 'Hand' }),
				new Stepper(
					{},
					this.fewer,
					this.handValue,
					this.more,
					new Component({ addClass: 'unit', textContent: 'cards each' }),
				),
			),
			new Component(
				{ addClass: 'field' },
				new Component(
					{ addClass: 'row', style: { marginBottom: '10px' } },
					new Component({ addClass: 'label', textContent: 'Packs', style: { flex: 1, margin: 0 } }),
					quiet('All', () => all(true), { size: 'small' }),
					quiet('None', () => all(false), { size: 'small' }),
				),
				new Packs({ append: this.chips }),
			),
		);

		this.deal = new Button({ content: 'Deal the cards', addClass: 'go', onPointerPress: () => this.create() });
		this.note = new Component({ addClass: 'note' });
		this.actions(this.deal, this.note);

		this.refresh();
	}

	setHand(size) {
		this.handSize = Math.min(MAX_HAND, Math.max(MIN_HAND, size));
		this.refresh();
	}

	// A name for the room: one to start with, or another when the dice are pressed (and said when it can't be had)
	async randomName({ asked = false } = {}) {
		const result = await getRandomName();

		if (!this.name?.elem.isConnected) return;
		if (result.status !== 'success') {
			if (asked) new Notify({ intent: 'danger', content: `Couldn't pick a random name: ${failureReason(result)}` });

			return;
		}

		this.name.options.value = result.body;
		this.refresh();
	}

	// What stands in the way of dealing, if anything; else what the deck comes to
	refresh() {
		const picked = this.packs.filter(({ name }) => this.picked.has(name));
		const blacks = picked.reduce((sum, pack) => sum + pack.blacks, 0);
		const whites = picked.reduce((sum, pack) => sum + pack.whites, 0);
		const missing =
			(!this.name.options.value.trim() && 'Name the room') ||
			(picked.length === 0 && 'Pick at least one pack') ||
			((blacks === 0 || whites === 0) && 'These packs need both black and white cards') ||
			'';

		this.packs.forEach(({ name }, index) => (this.chips[index].options.pressed = this.picked.has(name)));
		this.handValue.elem.textContent = this.handSize;
		this.fewer.options.disabled = this.handSize <= MIN_HAND;
		this.more.options.disabled = this.handSize >= MAX_HAND;
		this.deal.options.disabled = !!missing;
		this.note.elem.textContent =
			missing ||
			`${picked.length} ${picked.length === 1 ? 'pack' : 'packs'}: ${blacks.toLocaleString()} black, ${whites.toLocaleString()} white`;
	}

	async create() {
		if (this.deal.options.disabled) return;

		const packs = [...this.picked];
		const created = await createGame({
			body: { name: this.name.options.value.trim(), handSize: this.handSize, packs },
		});

		if (created.status !== 'success') {
			new Notify({ intent: 'danger', content: `Couldn't create the game: ${failureReason(created)}` });

			return;
		}

		localStorage.setItem(LAST_PACKS, JSON.stringify(packs));
		localStorage.setItem(LAST_HAND, JSON.stringify(this.handSize));

		go(paths.join, { gameId: created.body.id });
	}
}
