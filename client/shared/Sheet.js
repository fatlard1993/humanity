import { Component, Form, styled } from '@vanilla-bean/components';

// A column of fields in the middle of the table: joining a room, making one
const Sheet = styled(
	Component,
	() => `
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 22px;
		width: 100%;
		max-width: 520px;
		margin: 0 auto;
		padding: 30px 18px 40px;
		box-sizing: border-box;

		& .field {
			width: 100%;
		}

		& label, & .label {
			display: block;
			margin-bottom: 7px;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: var(--muted);
		}

		& .row {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
			align-items: center;
		}

		& .row > .vbc-input {
			flex: 1 1 0;
			min-width: 0;
		}

		/* What's wrong with a field goes under the row, not between the field and its button */
		& .row > .vbc-field-error {
			order: 1;
			flex: 1 0 100%;
		}

		& .at-table {
			color: var(--muted);
			font-weight: 600;
			text-align: center;
			overflow-wrap: anywhere;
		}
	`,
);

/**
 * The fields on a sheet: a Form whose fields sit bare on the table under the game's own small-caps captions, rather
 * than on the library Label's raised panel
 */
export const Fields = styled(
	Form,
	() => `
		display: flex;
		flex-direction: column;
		gap: 22px;
		width: 100%;

		&& > * {
			display: block;
			width: auto;
			margin: 0;
			padding: 0;
			background: none;
			color: inherit;
		}

		&& > * > label {
			display: block;
			margin: 0 0 7px;
			padding: 0;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: var(--muted);
		}

		&& > * > :not(label, .tooltip) {
			margin-top: 0;
		}

		/* A field with a button beside it (the dice): what's wrong with the field goes under the row, not between them */
		&& > .beside {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 7px 8px;

			& > label {
				flex: 1 0 100%;
				margin: 0;
			}

			& > .vbc-input {
				flex: 1 1 0;
				min-width: 0;
			}

			& > .vbc-field-error {
				order: 1;
				flex: 1 0 100%;
			}
		}

		/* A field whose control has tools of its own on the caption's line (Pick all, Pick none): it lays them there */
		&& > .with-tools {
			display: grid;
			grid-template-columns: 1fr auto;
			align-items: center;
			row-gap: 10px;

			& > label {
				grid-area: 1 / 1;
				margin: 0;
			}

			& > .vbc-field-error {
				grid-column: 1 / -1;
			}
		}
	`,
	// The column scrolls with the screen, and a focused field's ring isn't clipped at its edge
	{ style: { overflow: 'visible' } },
);

// Why a save failed, beside the button that saved: in the danger color, and read out as it's said
export const Failure = styled(
	Component,
	({ colors, fontSize }) => `
		flex: 1 0 100%;
		text-align: center;
		color: ${colors.light(colors.danger)};
		font-size: ${fontSize.sm};

		&:empty {
			display: none;
		}
	`,
	{ attributes: { role: 'alert' } },
);

export default Sheet;
