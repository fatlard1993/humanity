import { Component, styled } from '@vanilla-bean/components';

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

export default Sheet;
