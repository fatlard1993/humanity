import { appendStyles, theme } from '@vanilla-bean/components';

// The game is its two cards: ink, paper, heavy type, and one highlighter for whatever is picked. Imported first, so
// the library's components are drawn from these.

const ink = '#131211';
const paper = '#f3f0e7';
const table = '#1d1c1a';
const mark = '#ffd84a';

const { colors } = theme;
const color = value => colors.alpha(value, 1);

// The palette goes onto the library's color roles once, here, so every library part (a loading spinner, a toast, a
// focus ring, a dialog's edge) is drawn in it rather than in the library's blue and teal; the variables below read
// it back. A warm neutral underneath: its lightest, the library's text, is near paper
colors.gray = color('hsl(45, 7%, 47%)');
colors.surface = color(ink);
colors.raised = colors.alpha(paper, 0.05);
colors.border = colors.alpha(paper, 0.14);
colors.muted = colors.alpha(paper, 0.62);
colors.accent = color(mark);
colors.info = color(mark);
colors.selected = color(mark);
colors.danger = color('#c8372d');

appendStyles(
	`
	:root {
		--ink: ${colors.surface};
		--paper: ${paper};
		--table: ${table};
		--table-deep: #100f0e;
		--mark: ${colors.accent};
		--rule: ${colors.border};
		--rule-strong: ${colors.alpha(paper, 0.34)};
		--muted: ${colors.muted};
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

	/* A button (or a link drawn as one) is a slip of paper; a quiet one is only its outline; the one that matters most
	   is highlighted */
	.vbc-button:not(.variant-flat, .variant-chip),
	a.variant-button:not(.variant-flat, .variant-chip),
	.vbc-button.quiet,
	a.variant-button.quiet {
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

		&:visited {
			color: var(--ink);
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

		&.size-small {
			padding: 5px 12px;
			font-size: 0.85rem;
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
