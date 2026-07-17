import { Component, Button, styled } from '@vanilla-bean/components';
import { Join as BaseJoin } from '@fatlard1993/web-game-framework/ui/GameRoom';

const Heading = styled(
	Component,
	() => `
		font-size: 1.5em;
		text-align: center;
		margin: 0 0 12px;
	`,
	{ tag: 'h2' },
);

export default class Join extends BaseJoin {
	constructor(options, ...children) {
		super(
			{
				formData: { name: localStorage.getItem('lastName') || '' },
				formInputs: [{ key: 'name', label: 'Player Name', validations: [[/.+/, 'Required']] }],
				...options,
				body: { backgroundImage: false },
				toolbar: { heading: 'Join', backText: 'Cancel', joinText: 'Play' },
			},
			...children,
		);
	}

	build() {
		super.build();

		this._toolbar.options.right = [
			new Button({
				content: 'Watch',
				onPointerPress: () => {
					if (this.form.hasErrors()) return;

					localStorage.setItem('lastName', this.form.options.data.name);

					window.location.href = `#/watch/${this.options.gameId}`;
				},
			}),
			...this._toolbar.options.right,
		];
	}

	async _init() {
		await super._init();

		if (!this.game || !this.form) return;

		const heading = new Heading({ content: this.game.name });
		this._body.elem.prepend(heading.elem);
	}
}
