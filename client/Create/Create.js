import { DomElem, List, Link, Button, Form, Input, updateValidationErrors, styled } from 'vanilla-bean-components';

import Notify from '../shared/Notify';
import { View } from '../layout';
import { getPacks, createGame } from '../api';

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
					left: [new Link({ textContent: 'Cancel', href: '#/hub' })],
					right: [
						new Button({
							textContent: 'Create',
							onPointerPress: async () => {
								if (this.form.validate()) return;

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
				{ key: 'name', label: 'Room Name', validations: [[/.+/, 'Required']] },
				{
					key: 'submissionTimer',
					Component: DomElem,
					append: [
						new Input({
							type: 'number',
							value: formData.submissionTimer,
							onChange: ({ value }) => {
								this.form.options.data.submissionTimer = value;
							},
						}),
						new DomElem(
							{},
							new Input({
								type: 'checkbox',
								style: { marginTop: '6px' },
								onChange: ({ value }) => {
									this.form.options.data.randomizeMissingSubmissions = value;
								},
							}),
							new DomElem({ tag: 'label' }, 'Randomize submission on timeout'),
						),
					],
				},
				{
					key: 'voteTimer',
					Component: DomElem,
					append: [
						new Input({
							type: 'number',
							value: formData.voteTimer,
							onChange: ({ value }) => {
								this.form.options.data.voteTimer = value;
							},
						}),
						new DomElem(
							{},
							new Input({
								type: 'checkbox',
								style: { marginTop: '6px' },
								onChange: ({ value }) => {
									this.form.options.data.randomizeMissingVotes = value;
								},
							}),
							new DomElem({ tag: 'label' }, 'Randomize vote on timeout'),
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
				{
					key: 'packs',
					Component: CheckList,
					items: packs.body.map(name => [
						new Input({
							type: 'checkbox',
							name,
							onChange: event => {
								event.stopPropagation();

								this.form.options.data.packs[event.value ? 'add' : 'delete'](name);
							},
						}),
						new DomElem({ tag: 'label', for: name }, name),
					]),
					validate: () =>
						updateValidationErrors({
							elem: this.form.inputElements.packs.elem,
							validations: [[value => value > 0, 'Must select at least 1 pack']],
							value: this.form.options.data.packs.size,
						}),
				},
			],
		});
	}
}
