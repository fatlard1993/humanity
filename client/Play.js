import { Button, Component, Notify, randInt, styled, vibrate } from '@vanilla-bean/components';

import { act, enterGame } from '@fatlard1993/web-game-framework/client';
import { ExitDialog } from '@fatlard1993/web-game-framework/ui/GameRoom';
import JoinCard from '@fatlard1993/web-game-framework/ui/JoinCard';

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

		@media ${media.phone} {
			& .pair {
				zoom: 0.72;
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

		this.mode = (view.stage === 'end' && 'end') || (theirTurn && 'pick') || 'wait';

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

		this.body.empty();
		this.actions();
		this[`render_${this.mode}`]();
	}

	// Where the round is, for the bar
	progress() {
		const { stage, players } = this.game;

		if (stage === 'end') return 'Round over';
		if (stage === 'wait') return 'Getting ready';

		const inRound = players.filter(player => !seatStatus(this.game, player).out);
		const done = inRound.filter(player => seatStatus(this.game, player).done).length;

		return `${stage === 'play' ? 'Cards in' : 'Votes in'}: ${done} of ${inRound.length}`;
	}

	// What the table shows, to tell whether a new view changes it
	drawnFrom() {
		const { black, players, submissions, selected, results, scores, hand } = this.game;
		const seats = players.map(({ id, name, stage }) => [id, name, stage]);

		if (this.mode === 'pick')
			return [this.mode, this.game.stage, black, this.game.stage === 'play' ? hand : submissions];
		if (this.mode === 'end') return [this.mode, black, results, scores, seats];

		return [this.mode, this.game.stage, black, selected, seats, scores];
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

				commit.elem.disabled = true;

				const done = await act(playing ? 'play' : 'vote', { card: picked });

				// Refused (or no answer): the pick is still up, to try again
				if (!done.ok && commit.elem.isConnected) commit.elem.disabled = !picked;
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
				commit.elem.disabled = !card;
			},
		});

		this.actions(
			commit,
			playing ? 'Pick the card that answers it best' : 'Pick your favorite. Your own card is not here.',
		);
	}

	render_end() {
		new Results({ game: this.game, playerId: this.playerId, appendTo: this.body });

		this.actions(new Button({ content: 'Next round', addClass: 'go', onPointerPress: () => act('ready') }));
	}
}
