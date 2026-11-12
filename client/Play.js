import { Button, Component, Input, Notify, randInt, styled, vibrate } from '@vanilla-bean/components';

import { act, enterGame } from '@fatlard1993/web-game-framework/client';
import { ExitDialog } from '@fatlard1993/web-game-framework/ui/GameRoom';
import JoinCard from '@fatlard1993/web-game-framework/ui/JoinCard';

import { MAX_CHANGES, changes, editProblem } from '../rules/edit.js';
import Card from './shared/Card.js';
import PickHand from './shared/PickHand.js';
import Results from './shared/Results.js';
import RoomDialog from './shared/RoomDialog.js';
import ScoreDialog from './shared/ScoreDialog.js';
import Screen, { go, quiet } from './shared/Screen.js';
import Seats, { listNames, seatStatus, waitingOn } from './shared/Seats.js';

const tossed = () => `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`;

// Between turns: what's being waited for, over the seats
const Lobby = styled(
	Component,
	({ media }) => `
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
		width: 100%;
		max-width: 760px;
		margin: 0 auto;
		padding: 30px 16px 36px;
		box-sizing: border-box;

		& .headline {
			margin: 0;
			font-size: clamp(1.6rem, 5vw, 2.4rem);
			font-weight: 800;
			letter-spacing: -0.035em;
			line-height: 1.05;
			text-align: center;
			text-wrap: balance;
		}

		& .sub {
			margin-top: 8px;
			color: var(--muted);
			font-weight: 600;
			text-align: center;
		}

		& .pair {
			display: flex;
			justify-content: center;

			& > :last-child {
				margin-left: -34px;
				margin-top: 44px;
			}
		}

		/* A tiebreak's cards side by side, each under whose it is */
		& .duel {
			display: flex;
			flex-wrap: wrap;
			justify-content: center;
			gap: 22px;
			/* Three cards across in the column */
			zoom: 0.9;

			& figure {
				margin: 0;
			}

			& figcaption {
				margin-bottom: 10px;
				font-size: 0.72rem;
				font-weight: 700;
				letter-spacing: 0.09em;
				text-transform: uppercase;
				text-align: center;
				color: var(--muted);
				overflow-wrap: anywhere;
			}

			& textarea {
				display: block;
				width: 216px;
				height: 288px;
				padding: 18px;
				border: 0;
				border-radius: 14px;
				outline: 4px solid var(--mark);
				background: var(--paper);
				color: var(--ink);
				box-shadow: var(--card-shadow);
				font: inherit;
				font-size: 1.15rem;
				font-weight: 700;
				line-height: 1.22;
				letter-spacing: -0.012em;
				resize: none;
			}
		}

		@media ${media.phone} {
			& .pair {
				zoom: 0.72;
			}

			& .duel {
				zoom: 0.66;
				gap: 16px;
			}

			/* The question lies across the top as a strip, leaving the row to the cards at stake */
			& .duel .type-black {
				width: auto;
				height: auto;
				min-height: 0;
				padding-bottom: 44px;
				transform: none !important;
			}

			& .duel > .type-black, & .duel > figure:has(.type-black) {
				flex: 1 0 100%;
				box-sizing: border-box;
			}

			& .duel > figure:has(.type-black) figcaption {
				display: none;
			}

			/* Typed in at full size: a small field makes a phone zoom the page */
			& .duel.editing {
				zoom: 1;
			}
		}
	`,
);

const Board = styled(
	Component,
	() => `
		display: flex;
		flex-direction: column;
		padding: 18px 0 40px;
	`,
);

export default class Play extends Screen {
	build() {
		super.build();

		this.left(
			quiet('Leave', () => {
				new ExitDialog({
					gameId: this.options.gameId,
					playerId: this.playerId,
					header: 'Leave the table?',
					label: 'Give up my seat, hand and score',
					confirmLabel: 'Leave',
				});
			}),
		);

		this.enter();
	}

	async enter() {
		const { gameId } = this.options;
		const { playerId, leave } = await enterGame(gameId, {
			onState: view => this.show(view),
			onUpdate: message => {
				if (message.update === 'poke' && message.targetPlayerId === this.playerId) {
					vibrate([200, 100, 200]);
					new Notify({ content: 'Poke. The table is waiting on you.', intent: 'warning', timeout: 2500 });
				}
			},
			notMember: () => go(`#/join/${gameId}`),
			gone: () => {
				new Notify({ intent: 'danger', content: 'That game is gone' });
				go('#/hub');
			},
		});

		this.playerId = playerId;
		this.addCleanup('game', leave);
		// Left before the game opened
		if (!this.elem.isConnected) leave();
	}

	// Each view of the game the server sends. The bar says where the round is every time; the table is laid again only
	// when what it shows has changed, so a card picked and raised stays raised while others play.
	show(view) {
		const player = view.players.find(({ id }) => id === this.playerId);

		if (!player) {
			go(`#/join/${this.options.gameId}`);

			return;
		}

		this.game = view;
		this.player = player;
		// A card to pick while the round waits on this player; otherwise the table, or the round's end
		const theirTurn = view.stage !== 'wait' && player.stage === view.stage;
		// Tied, with a tiebreak move still to make
		const theirMove = view.stage === 'tiebreak' && view.tiebreak.waiting.includes(player.id);

		this.mode = (view.stage === 'end' && 'end') || (theirMove && 'duel') || (theirTurn && 'pick') || 'wait';
		if (this.mode !== 'duel') this.swapping = false;

		this.title(view.name, this.progress());
		this.right(
			Object.keys(view.scores).length > 0 &&
				quiet('', () => new ScoreDialog({ game: this.game, playerId: this.playerId }), {
					icon: 'trophy',
					attributes: { 'aria-label': 'The standings', title: 'The standings' },
				}),
			quiet('', () => new RoomDialog({ game: this.game, remove: false }), {
				icon: 'qrcode',
				attributes: { 'aria-label': 'Invite someone', title: 'Invite someone' },
			}),
		);

		const drawn = JSON.stringify(this.drawnFrom());

		if (drawn === this._drawn) return;
		this._drawn = drawn;
		this.lay();
	}

	// The table laid for what the game is showing now
	lay() {
		this.body.empty();
		this.actions();
		this[`render_${this.mode}`]();
	}

	// Where the round is, for the bar
	progress() {
		const { stage, players } = this.game;

		if (stage === 'end') return 'Round over';
		if (stage === 'wait') return 'Getting ready';
		if (stage === 'tiebreak') return 'Tiebreaker';

		const inRound = players.filter(player => !seatStatus(this.game, player).out);
		const done = inRound.filter(player => seatStatus(this.game, player).done).length;

		const counted = (stage === 'play' && 'Cards in') || (this.game.tiebreak ? 'Tiebreak votes in' : 'Votes in');

		return `${counted}: ${done} of ${inRound.length}`;
	}

	// What the table shows, to tell whether a new view changes it
	drawnFrom() {
		const { black, players, submissions, selected, results, scores, hand, tiebreak, duel } = this.game;
		const seats = players.map(({ id, name, stage }) => [id, name, stage]);

		if (this.mode === 'pick')
			return [this.mode, this.game.stage, black, this.game.stage === 'play' ? hand : submissions];
		if (this.mode === 'end') return [this.mode, black, results, scores, seats];
		// Their move in a tiebreak: laid again for a new step of it, not for what others do, so what's typed stays
		if (this.mode === 'duel') return [this.mode, tiebreak.phase, duel, hand];

		return [this.mode, this.game.stage, black, selected, seats, scores, tiebreak, duel, submissions];
	}

	// Nothing of this player's to do but wait: before a round (ready up), after playing or voting, or sitting one out
	render_wait() {
		const { game, player, playerId } = this;
		const lobby = new Lobby({ appendTo: this.body });
		const pending = waitingOn(game).filter(name => name !== player.name || game.stage !== 'wait');
		const waiting = pending.length > 0 ? `Waiting on ${listNames(pending)}` : '';
		const headline = (text, sub) =>
			new Component(
				{ appendTo: lobby },
				new Component({ tag: 'h2', addClass: 'headline', textContent: text }),
				sub ? new Component({ addClass: 'sub', textContent: sub }) : '',
			);

		if (game.stage === 'wait') {
			const alone = game.players.length < 2;
			const ready = player.stage === 'play';

			if (alone) headline('It takes two to be terrible', 'Get someone to scan this, or send them the link.');
			else if (ready) headline("You're ready", waiting);
			else headline('Ready when you are', 'The round starts once everyone is ready.');

			if (alone) new JoinCard({ gameId: game.id, size: 200, appendTo: lobby });

			new Seats({ game, playerId, appendTo: lobby });

			if (!ready)
				this.actions(new Button({ content: "I'm ready", addClass: 'go', onPointerPress: () => act('ready') }));
			else if (!alone) this.actions(waiting);

			return;
		}

		// A tied vote being broken by the tied: everyone else, and the tied once their move is made, see the cards at stake
		if (game.stage === 'tiebreak') {
			const tied = game.players.filter(({ id }) => game.tiebreak.players.includes(id));
			const others = tied.filter(({ id }) => id !== playerId).map(({ name }) => name);

			headline(
				'Tiebreaker',
				`${game.duel ? `You and ${listNames(others)}` : listNames(others)} tied. ${waiting || 'Voting again next.'}`,
			);

			new Component({
				addClass: 'duel',
				appendTo: lobby,
				append: [
					new Card({ type: 'black', style: { transform: tossed() }, innerHTML: game.black }),
					...[...(game.duel ? [game.duel.mine] : []), ...game.submissions].map(
						card => new Card({ type: 'white', style: { transform: `rotate(${randInt(-4, 4)}deg)` }, innerHTML: card }),
					),
				],
			});

			new Seats({ game, playerId, appendTo: lobby });

			return;
		}

		// Sitting this round out: they sat down after it began
		if (player.stage === 'wait') {
			headline('A round is under way', "You're dealt in for the next one.");
			new Seats({ game, playerId, appendTo: lobby });

			if (game.stage === 'play')
				this.actions(new Button({ content: 'Deal me in now', addClass: 'go', onPointerPress: () => act('ready') }));

			return;
		}

		headline(game.stage === 'play' ? 'Your card is in' : 'Your vote is in', waiting);

		new Component(
			{ addClass: 'pair', appendTo: lobby },
			new Card({ type: 'black', style: { transform: tossed() }, innerHTML: game.black }),
			game.selected ? new Card({ type: 'white', style: { transform: tossed() }, innerHTML: game.selected }) : '',
		);

		new Seats({ game, playerId, appendTo: lobby });
	}

	// A card to pick: one from the hand to play, or one of what was played to vote for
	render_pick() {
		const { game } = this;
		const playing = game.stage === 'play';
		const board = new Board({ appendTo: this.body });
		let picked;

		const commit = new Button({
			content: playing ? 'Play this card' : 'Vote for this card',
			addClass: 'go',
			disabled: true,
			onPointerPress: async () => {
				if (!picked) return;

				commit.options.disabled = true;

				const done = await act(playing ? 'play' : 'vote', { card: picked });

				// Refused (or no answer): the pick is still up, to try again
				if (!done.ok && commit.elem.isConnected) commit.options.disabled = !picked;
			},
		});

		new Card({
			type: 'black',
			style: { margin: '0 auto', transform: tossed() },
			innerHTML: game.black,
			appendTo: board,
		});

		new PickHand({
			appendTo: board,
			cards: playing ? game.hand : game.submissions,
			onPick: card => {
				picked = card;
				commit.options.disabled = !card;
			},
		});

		this.actions(
			commit,
			(playing && 'Pick the card that answers it best') ||
				(game.tiebreak && 'The tiebreak: pick between the cards that tied, as they stand now.') ||
				'Pick your favorite. Your own card is not here.',
		);
	}

	// This player's move in a tiebreak: first the choice (rewrite their opponent's card, or swap their own for one
	// from their hand), then, if they chose to rewrite, the rewriting
	render_duel() {
		const { game } = this;
		const { duel, tiebreak, hand, black } = game;
		const opponent = game.players.find(({ id }) => id === duel.opponent)?.name ?? 'your opponent';

		if (tiebreak.phase === 'edit') {
			this.rewrite(opponent);

			return;
		}

		// Swapping: the hand, to pick the card to put down instead
		if (this.swapping) {
			const board = new Board({ appendTo: this.body });
			let picked;

			const swap = new Button({
				content: 'Swap to this card',
				addClass: 'go',
				disabled: true,
				onPointerPress: async () => {
					if (!picked) return;

					swap.options.disabled = true;
					this.swapping = false;

					const done = await act('tiebreak', { move: 'repick', card: picked });

					if (!done.ok && swap.elem.isConnected) swap.options.disabled = false;
				},
			});

			new Card({ type: 'black', style: { margin: '0 auto', transform: tossed() }, innerHTML: black, appendTo: board });
			new PickHand({
				appendTo: board,
				cards: hand,
				onPick: card => {
					picked = card;
					swap.options.disabled = !card;
				},
			});

			this.actions(
				swap,
				quiet('Back', () => {
					this.swapping = false;
					this.lay();
				}),
				`${opponent} gets to rewrite whichever card you end up with, if they choose to.`,
			);

			return;
		}

		const lobby = new Lobby({ appendTo: this.body });
		const figure = (caption, card, type = 'white') =>
			new Component(
				{ tag: 'figure' },
				new Component({ tag: 'figcaption', textContent: caption }),
				new Card({ type, innerHTML: card }),
			);

		new Component(
			{ appendTo: lobby },
			new Component({ tag: 'h2', addClass: 'headline', textContent: 'Tiebreaker' }),
			new Component({
				addClass: 'sub',
				textContent: `The vote tied. Change up to ${MAX_CHANGES} characters of ${opponent}'s card, or swap your own.`,
			}),
		);
		new Component(
			{ addClass: 'duel', appendTo: lobby },
			figure('The question', black, 'black'),
			figure('Yours', duel.mine),
			figure(opponent, duel.theirs),
		);

		this.actions(
			new Button({
				content: `Rewrite ${opponent}'s card`,
				addClass: 'go',
				onPointerPress: () => act('tiebreak', { move: 'edit' }),
			}),
			quiet('Swap my card', () => {
				this.swapping = true;
				this.lay();
			}),
			'If they swap theirs, you rewrite the card they swap to. Then everyone votes again.',
		);
	}

	// Rewriting the opponent's card: the card itself to type into, held to the changes allowed
	rewrite(opponent) {
		const { duel, tiebreak, black } = this.game;
		const lobby = new Lobby({ appendTo: this.body });
		const field = new Input({
			tag: 'textarea',
			value: duel.theirs,
			height: '288px',
			attributes: { 'aria-label': `${opponent}'s card`, spellcheck: 'false' },
		});
		const note = new Component({ addClass: 'note' });
		const lock = new Button({
			content: 'Lock it in',
			addClass: 'go',
			onPointerPress: async () => {
				lock.options.disabled = true;

				const done = await act('tiebreak', { text: field.options.value });

				if (!done.ok && lock.elem.isConnected) check();
			},
		});
		const check = () => {
			const problem = editProblem(duel.theirs, field.options.value);
			const used = changes(duel.theirs, field.options.value);

			lock.options.disabled = !!problem;
			note.elem.textContent = used > MAX_CHANGES || !problem ? `${used} of ${MAX_CHANGES} changes used` : `${problem}.`;
			note.elem.style.color = problem ? 'var(--mark)' : '';
		};

		field.elem.addEventListener('input', check);

		new Component(
			{ appendTo: lobby },
			new Component({ tag: 'h2', addClass: 'headline', textContent: `Rewrite ${opponent}'s card` }),
			new Component({
				addClass: 'sub',
				textContent:
					tiebreak.moves?.[duel.opponent] === 'repick'
						? `They swapped to this one. Change up to ${MAX_CHANGES} characters of it.`
						: `Change up to ${MAX_CHANGES} characters: swap one, add one, take one out.`,
			}),
		);
		new Component(
			{ addClass: ['duel', 'editing'], appendTo: lobby },
			new Card({ type: 'black', style: { transform: 'rotate(-3deg)' }, innerHTML: black }),
			field,
		);

		this.actions(lock, note);
		check();
		field.elem.focus();
	}

	render_end() {
		new Results({ game: this.game, playerId: this.playerId, appendTo: this.body });

		this.actions(new Button({ content: 'Next round', addClass: 'go', onPointerPress: () => act('ready') }));
	}
}
