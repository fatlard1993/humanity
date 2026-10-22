import { Component, List, Button, Input, Label, styled, Notify } from '@vanilla-bean/components';
import { failureReason } from '@vanilla-bean/hypertether';
import { Create as BaseCreate } from '@fatlard1993/web-game-framework/ui/GameRoom';

import { getPacks, getRandomName } from './api';

const CheckList = styled(
	List,
	({ colors }) => `
		padding: 0;

		& li {
			margin: 6px;
			padding: 6px;
			border: 2px solid ${colors.alpha(colors.white, 0.4)};
			border-radius: 6px;
			list-style: none;
			display: flex;
			align-items: center;
			gap: 6px;
		}
	`,
);

export default class Create extends BaseCreate {
	constructor(options, ...children) {
		super(
			{
				...options,
				toolbar: { heading: 'Create', backText: 'Cancel', createText: 'Create' },
			},
			...children,
		);
	}

	create() {
		if (this.form.options.data.packs.size === 0) {
			new Notify({ type: 'error', content: 'Must select at least 1 pack' });
			return;
		}

		return super.create();
	}

	createBody() {
		return { ...this.form.options.data, packs: [...this.form.options.data.packs] };
	}

	async _init() {
		const packs = await getPacks();

		if (packs.response.status !== 200) {
			new Notify({ type: 'error', content: failureReason(packs) });
			return;
		}

		const formData = {
			name: '',
			handSize: 10,
			packs: new Set(),
		};

		this.options.formData = formData;
		this.options.formInputs = [
			{
				key: 'name',
				label: {
					label: 'Room Name',
					variant: 'inline',
					append: new Button({
						content: '\u{1F3B2}',
						styles: () => `
							min-width: unset;
							padding: 2px 8px;
							margin: 0 6px;
							font-size: 18px;
							vertical-align: middle;
						`,
						onPointerPress: async () => {
							const result = await getRandomName();
							if (result.status !== 'success') return;
							this.form.options.data.name = result.body;
							this.form.inputElements.name.options.value = result.body;
						},
					}),
				},
				validations: [[/.+/, 'Required']],
			},
			{
				key: 'handSize',
				type: 'number',
				validations: [[value => value >= 2, 'Must be 2 or more']],
			},
		];

		super._init();

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
							checkboxes.forEach(cb => {
								cb.options.value = true;
							});
						},
					}),
					new Button({
						content: 'None',
						onPointerPress: () => {
							this.form.options.data.packs.clear();
							checkboxes.forEach(cb => {
								cb.options.value = false;
							});
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
