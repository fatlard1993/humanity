import { Component, List, Link, Button, Form, Input, Label, styled } from 'vanilla-bean-components';

import Notify from './shared/Notify.js';
import View from './shared/View.js';
import { getPacks, getRandomName, createGame } from './api';

const CheckList = styled(
	List,
	({ colors }) => `
		padding: 0;

		li {
			margin: 6px;
			padding: 6px;
			border: 2px solid ${colors.white.setAlpha(0.4)};
			border-radius: 6px;
			list-style: none;
		}
	`,
);

export default class Create extends View {
	constructor(options, ...children) {
		super(
			{
				...options,
				toolbar: {
					heading: 'Create',
					left: [new Link({ textContent: 'Cancel', href: '#/hub', variant: 'button' })],
					right: [
						new Button({
							textContent: 'Create',
							onPointerPress: async () => {
								if (this.form.validate()) return;

								if (this.form.options.data.packs.size === 0) {
									new Notify({ type: 'error', content: 'Must select at least 1 pack' });
									return;
								}

								const game = (
									await createGame({ body: { ...this.form.options.data, packs: [...this.form.options.data.packs] } })
								).body;

								window.location.href = `#/join/${game.id}`;
							},
						}),
					],
				},
			},
			...children,
		);
	}

	async render() {
		super.render();

		const packs = await getPacks();

		if (packs.response.status !== 200) {
			new Notify({ type: 'error', content: packs.body?.message || packs.response.statusText });
			return;
		}

		const formData = {
			name: '',
			submissionTimer: 0,
			voteTimer: 0,
			customCards: false,
			handSize: 10,
			npcCount: 0,
			packs: new Set(),
			randomizeMissingSubmissions: false,
			randomizeMissingVotes: false,
		};

		this.form = new Form({
			appendTo: this._body,
			styles: () => `
				margin: 12px 0 12px 12px;
				padding-right: 12px;
			`,
			data: formData,
			inputs: [
				{
					key: 'name',
					label: {
						label: 'Room Name',
						inline: { after: true },
						append: new Button({
							content: '\u{1F3B2}',
							styles: () => `
								min-width: unset;
								padding: 2px 8px;
								margin-left: 6px;
								font-size: 18px;
								vertical-align: middle;
							`,
							onPointerPress: async () => {
								const result = await getRandomName();
								if (!result.success) return;
								this.form.options.data.name = result.body;
								this.form.inputElements.name.options.value = result.body;
							},
						}),
					},
					validations: [[/.+/, 'Required']],
				},
				{
					key: 'submissionTimer',
					Component: Component,
					append: [
						new Input({
							type: 'number',
							value: formData.submissionTimer,
							onChange: ({ value }) => {
								this.form.options.data.submissionTimer = value;
							},
						}),
						new Component(
							{},
							new Input({
								type: 'checkbox',
								style: { marginTop: '6px' },
								onChange: ({ value }) => {
									this.form.options.data.randomizeMissingSubmissions = value;
								},
							}),
							new Component({ tag: 'label' }, 'Randomize submission on timeout'),
						),
					],
				},
				{
					key: 'voteTimer',
					Component: Component,
					append: [
						new Input({
							type: 'number',
							value: formData.voteTimer,
							onChange: ({ value }) => {
								this.form.options.data.voteTimer = value;
							},
						}),
						new Component(
							{},
							new Input({
								type: 'checkbox',
								style: { marginTop: '6px' },
								onChange: ({ value }) => {
									this.form.options.data.randomizeMissingVotes = value;
								},
							}),
							new Component({ tag: 'label' }, 'Randomize vote on timeout'),
						),
					],
				},
				{ key: 'customCards', Component: Input, type: 'checkbox' },
				{
					key: 'handSize',
					type: 'number',
					validations: [
						[
							value => value >= (this.form.options.data.customCards ? 0 : 2),
							() => `Must be ${this.form.options.data.customCards ? 0 : 2} or more`,
						],
					],
				},
				{ key: 'npcCount', label: 'NPCs', type: 'number' },
			],
		});

		// Add packs selection separately
		const packNames = packs.body;
		const checkboxes = [];

		new Label({
			label: 'Packs (select at least one)',
			appendTo: this._body,
			styles: () => `
				margin: 12px 0 6px 12px;
			`,
			append: [
				new Component(
					{
						styles: () => `
							display: flex;
							gap: 6px;
							margin-bottom: 6px;
						`,
					},
					new Button({
						content: 'All',
						onPointerPress: () => {
							packNames.forEach(name => this.form.options.data.packs.add(name));
							checkboxes.forEach(cb => { cb.options.value = true; });
						},
					}),
					new Button({
						content: 'None',
						onPointerPress: () => {
							this.form.options.data.packs.clear();
							checkboxes.forEach(cb => { cb.options.value = false; });
						},
					}),
				),
				new CheckList({
					items: packNames.map(name => {
						const checkbox = new Input({
							type: 'checkbox',
							name,
							onChange: event => {
								event.stopPropagation();

								this.form.options.data.packs[event.value ? 'add' : 'delete'](name);
							},
						});
						checkboxes.push(checkbox);
						return [checkbox, new Component({ tag: 'label', for: name }, name)];
					}),
				}),
			],
		});
	}
}
