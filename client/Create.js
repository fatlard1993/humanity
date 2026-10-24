import { Component, List, Button, Input, Label, styled, theme, Notify, failureReason } from '@vanilla-bean/components';
import { Create as BaseCreate } from '@fatlard1993/web-game-framework/ui/GameRoom';

import { getPacks, getRandomName } from './api';

const CheckList = styled(
	List,
	({ colors, space, radius }) => `
		padding: 0;

		& li {
			margin: ${space.sm};
			padding: ${space.sm};
			border: 2px solid ${colors.border};
			border-radius: ${radius.md};
			list-style: none;
			display: flex;
			align-items: center;
			gap: ${space.sm};
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
			new Notify({ intent: 'danger', content: 'Must select at least 1 pack' });
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
			new Notify({ intent: 'danger', content: failureReason(packs) });
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
						icon: 'dice',
						tooltip: 'A random name',
						styles: ({ space }) => `
							margin: 0 ${space.sm};
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
				validate: value => (value ? null : 'Required'),
			},
			{
				key: 'handSize',
				type: 'number',
				validate: value => (value >= 2 ? null : 'Must be 2 or more'),
			},
		];

		super._init();

		const packNames = packs.body;
		const checkboxes = [];

		new Label({
			label: 'Packs (select at least one)',
			appendTo: this._body,
			style: { margin: `${theme.space.md} 0 ${theme.space.sm} ${theme.space.md}` },
			append: [
				new Component(
					{
						styles: ({ space }) => `
							display: flex;
							gap: ${space.sm};
							margin-bottom: ${space.sm};
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
