import { appendStyles, theme } from '@vanilla-bean/components';

// The game is its two cards: ink, paper, heavy type, and one highlighter for whatever is picked. Imported first, so
// the library's components are drawn from these.

export const ink = '#131211';
export const paper = '#f3f0e7';
export const table = '#1d1c1a';
export const mark = '#ffd84a';

const color = value => theme.colors.alpha(value, 1);

// A warm neutral: its lightest is paper, its darkest ink
theme.colors.gray = color('hsl(45, 7%, 47%)');
theme.colors.surface = color('#1a1918');
theme.colors.accent = color('#a8a498');
theme.colors.selected = color(mark);
theme.colors.danger = color('#c8372d');

appendStyles(
	`
	:root {
		--ink: ${ink};
		--paper: ${paper};
		--table: ${table};
		--table-deep: #100f0e;
		--mark: ${mark};
		--rule: rgb(243 240 231 / 0.14);
		--rule-strong: rgb(243 240 231 / 0.34);
		--muted: rgb(243 240 231 / 0.62);
		--face: 'Helvetica Neue', Helvetica, 'Nimbus Sans', 'Liberation Sans', Arial, sans-serif;
		--card-shadow: 0 1px 2px rgb(0 0 0 / 0.5), 0 12px 24px -10px rgb(0 0 0 / 0.75);
	}

	html:root {
		font-family: var(--face);
		font-weight: 500;
		line-height: 1.35;
	}

	html:root body {
		color: var(--paper);
		background:
			radial-gradient(120% 80% at 50% -10%, #302d29 0%, var(--table) 46%, var(--table-deep) 100%) fixed,
			var(--table-deep);
	}

	/* A heading is the color of what it's printed on */
	html:root :is(h1, h2, h3, h4) {
		color: inherit;
	}

	/* A button is a slip of paper; a quiet one is only its outline; the one that matters most is highlighted */
	.vbc-button:not(.variant-flat, .variant-chip) {
		padding: 9px 16px;
		border-radius: 9px;
		background-color: var(--paper);
		color: var(--ink);
		font-family: var(--face);
		font-weight: 700;
		letter-spacing: -0.01em;
		box-shadow: 0 2px 0 rgb(0 0 0 / 0.55);
		transition: translate 0.12s, background-color 0.12s, color 0.12s, box-shadow 0.12s;

		&:hover, &:focus-visible {
			filter: none;
			background-color: #fff;
			translate: 0 -1px;
		}

		&:active {
			filter: none;
			translate: 0 1px;
			box-shadow: 0 1px 0 rgb(0 0 0 / 0.55);
		}

		&.quiet {
			background-color: transparent;
			color: var(--paper);
			box-shadow: inset 0 0 0 1.5px var(--rule-strong);

			&:hover, &:focus-visible {
				background-color: rgb(243 240 231 / 0.1);
			}
		}

		&.go {
			background-color: var(--mark);

			&:hover, &:focus-visible {
				background-color: #ffe27a;
			}
		}

		&.intent-danger {
			background-color: #c8372d;
			color: var(--paper);

			&:hover, &:focus-visible {
				background-color: #dc463b;
			}
		}

		&:is(:disabled, .disabled), &:is(:disabled, .disabled):hover {
			background-color: transparent;
			color: rgb(243 240 231 / 0.38);
			box-shadow: inset 0 0 0 1.5px var(--rule);
			translate: none;
			cursor: default;
		}

		&:empty, &.icon {
			width: 38px;
			height: 38px;
			padding: 0;
		}
	}

	.vbc-input:not([type='checkbox']) {
		padding: 10px 12px;
		border-radius: 9px;
		font-family: var(--face);
		font-size: 1rem;
		font-weight: 700;
	}
`,
	'humanity-theme',
);
