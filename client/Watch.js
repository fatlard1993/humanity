import { Component, Content, EmptyState, Notify, SectionLabel, randInt, styled } from '@vanilla-bean/components';

import { enterGame } from '@fatlard1993/web-game-framework/client';
import JoinCard from '@fatlard1993/web-game-framework/ui/JoinCard';

import Card from './shared/Card.js';
import Results from './shared/Results.js';
import ScoreDialog from './shared/ScoreDialog.js';
import { go, href, paths } from './paths.js';
import Screen, { Wordmark, goTo, quiet } from './shared/Screen.js';
import Seats, { listNames, seatStatus, waitingOn } from './shared/Seats.js';

const tossed = () => `translate(${randInt(-9, 9)}px, ${randInt(0, 13)}px) rotate(${randInt(-9, 9)}deg)`;

// The table as the room sees it on a shared screen: the round in the middle, and down the side the way in and who's in
const Room = styled(
	Component,
	({ media }) => `
		flex: 1;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		min-height: 0;

		& > .round {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 26px;
			padding: 30px 20px 40px;
			min-width: 0;
		}

		& .headline {
			margin: 0;
			font-size: clamp(1.6rem, 3.4vw, 3rem);
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

		& .played {
			display: flex;
			flex-wrap: wrap;
			justify-content: center;
			gap: 18px 22px;
		}

		& > .rail {
			display: flex;
			flex-direction: column;
			gap: 20px;
			padding: 24px 18px;
			border-left: 1px solid var(--rule);

		}

		/* A big screen across the room: everything larger */
		@media (min-width: 1500px) {
			grid-template-columns: minmax(0, 1fr) 380px;

			& > .round {
				zoom: 1.15;
			}

			& > .rail {
				zoom: 1.2;
			}
		}

		@media ${media.phone} {
			/* One column, scrolled as a whole by the screen */
			display: block;
			flex: none;

			& > .round {
				overflow: visible;
				padding: 22px 12px 28px;
			}

			& > .rail {
				border-left: 0;
				border-top: 1px solid var(--rule);
				overflow: visible;
			}

			& .played {
				zoom: 0.62;
			}
		}
	`,
);

export default class Watch extends Screen {
	build() {
		super.build();

		const { gameId } = this.options;

		this.left(new Wordmark());

		this.room = new Room({ appendTo: this.body });
		this.round = new Content({ addClass: 'round', appendTo: this.room });
		this.rail = new Content({ addClass: 'rail', appendTo: this.room });

		// The way in stays put while the round is drawn and drawn again
		new SectionLabel({ textContent: 'Scan to play', appendTo: this.rail });
		new JoinCard({ gameId, size: 200, appendTo: this.rail });
		this.seats = new Component({ appendTo: this.rail });
		// Until the game's first view comes
		new EmptyState({ loading: true, appendTo: this.round });

		this.enter();
	}

	async enter() {
		const { gameId } = this.options;
		const { leave } = await enterGame(gameId, {
			watch: true,
			onState: view => this.show(view),
			gone: () => {
				new Notify({ intent: 'danger', content: 'That game is gone' });
				go(paths.hub);
			},
		});

		this.addCleanup('game', leave);
		// Left before the game opened
		if (!this.elem.isConnected) leave();
	}

	// Each view of the game the server sends, drawn again when what the screen shows has changed
	show(view) {
		const { name, stage, black, players, submissions, results, scores, tiebreak } = view;
		const drawn = JSON.stringify([
			name,
			stage,
			black,
			players.map(({ id, name, stage, selectedCard }) => [id, name, stage, !!selectedCard]),
			submissions,
			results,
			scores,
			tiebreak,
		]);

		if (drawn === this._drawn) return;
		this._drawn = drawn;
		this.game = view;

		this.title(
			name,
			{ wait: 'Getting ready', play: 'Playing cards', vote: 'Voting', tiebreak: 'Tiebreaker', end: 'Round over' }[
				stage
			],
		);
		this.right(
			quiet('Scores', () => new ScoreDialog({ game: this.game })),
			goTo('Leave', href(paths.hub), { variant: 'flat', addClass: 'quiet' }),
		);

		this.seats.empty();
		new SectionLabel({ textContent: 'At the table', appendTo: this.seats });
		if (players.length === 0)
			new Component({ textContent: 'Nobody yet.', appendTo: this.seats, style: { color: 'var(--muted)' } });
		new Seats({ game: view, appendTo: this.seats, style: { gridTemplateColumns: '1fr' } });

		this.round.empty();

		if (stage === 'end') {
			new Results({ game: view, appendTo: this.round, style: { padding: 0 } });

			return;
		}

		const [headline, sub] = this.calls(view);

		new Component(
			{ appendTo: this.round },
			new Component({ tag: 'h2', addClass: 'headline', textContent: headline }),
			sub ? new Component({ addClass: 'sub', textContent: sub }) : '',
		);

		// The question, and beside it the cards as they come in: face down, then turned over for the vote
		const played = [];

		if (stage === 'vote' || stage === 'tiebreak') played.push(...submissions.map(card => ({ innerHTML: card })));
		if (stage === 'play')
			played.push(...players.filter(({ selectedCard }) => selectedCard).map(() => ({ faceDown: true })));

		new Component({
			addClass: 'played',
			appendTo: this.round,
			append: [
				new Card({ type: 'black', style: { transform: tossed() }, innerHTML: black }),
				...played.map(
					card => new Card({ type: 'white', style: { transform: `rotate(${randInt(-4, 4)}deg)` }, ...card }),
				),
			],
		});
	}

	// What the room is being asked to do, and how far along it is
	calls(view) {
		const { stage, players, tiebreak } = view;
		const pending = waitingOn(view);
		const inRound = players.filter(player => !seatStatus(view, player).out);
		const done = inRound.length - pending.length;

		if (stage === 'play') return ['Play a card', `${done} of ${inRound.length} in`];
		if (stage === 'tiebreak') {
			const tied = players.filter(({ id }) => tiebreak.players.includes(id)).map(({ name }) => name);
			const doing = tiebreak.phase === 'choose' ? 'choosing a move' : 'rewriting a card';

			return [
				'Tiebreaker',
				`${listNames(tied)} tied. ${listNames(pending)} ${pending.length === 1 ? 'is' : 'are'} ${doing}.`,
			];
		}
		if (stage === 'vote' && tiebreak) return ['Tiebreak vote', `${done} of ${inRound.length} votes in`];
		if (stage === 'vote') return ['Vote for your favorite', `${done} of ${inRound.length} votes in`];
		if (players.length < 2) return ['Waiting for players', 'Scan the code to sit down. It takes two.'];

		return ['Ready up', pending.length > 0 ? `Waiting on ${listNames(pending)}` : ''];
	}
}
