import { Component, randInt, styled } from '@vanilla-bean/components';

import Card from './Card.js';
import Scoreboard from './Scoreboard.js';
import { listNames } from './Seats.js';

const tossed = () => `translate(${randInt(-6, 6)}px, ${randInt(0, 10)}px) rotate(${randInt(-7, 7)}deg)`;
const votes = count => `${count} ${count === 1 ? 'vote' : 'votes'}`;

/**
 * A round's end: who won it and with which card, every other card with who played it and the votes it took, and the
 * standings.
 * @param {object} options - Options
 * @param {object} options.game - The game, at its end stage
 * @param {string} [options.playerId] - Whose page this is
 */
export default class Results extends styled(
	Component,
	({ media }) => `
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 26px;
		width: 100%;
		max-width: 760px;
		margin: 0 auto;
		padding: 26px 16px 34px;
		box-sizing: border-box;

		& .headline {
			margin: 0;
			font-size: clamp(1.6rem, 5vw, 2.5rem);
			font-weight: 800;
			letter-spacing: -0.035em;
			line-height: 1.05;
			text-align: center;
			overflow-wrap: anywhere;
		}

		& .tally {
			margin-top: 8px;
			font-size: 0.78rem;
			font-weight: 700;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			text-align: center;
			color: var(--mark);
		}

		& .pair {
			display: flex;
			justify-content: center;
			padding: 4px 0 10px;

			& > :last-child {
				margin-left: -34px;
				margin-top: 44px;
			}
		}

		& section {
			width: 100%;
		}

		& h3 {
			margin: 0 0 10px;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: var(--muted);
		}

		& .played {
			display: flex;
			align-items: baseline;
			gap: 12px;
			padding: 12px 14px;
			margin-bottom: 8px;
			border-radius: 10px;
			background: var(--paper);
			color: var(--ink);
			box-shadow: var(--card-shadow);
			font-weight: 700;
			letter-spacing: -0.012em;

			& .text {
				flex: 1;
				min-width: 0;
				overflow-wrap: anywhere;
			}

			& .by {
				flex-shrink: 0;
				max-width: 45%;
				text-align: right;
				font-size: 0.8rem;
				opacity: 0.7;
				overflow-wrap: anywhere;
			}
		}

		@media ${media.phone} {
			& .pair {
				zoom: 0.72;
			}
		}
	`,
) {
	build() {
		const { game, playerId } = this.options;
		const { playerId: winnerId, card, votes: winningVotes, shared } = game.lastRoundWinner ?? {};
		const nameOf = id => game.players.find(player => player.id === id)?.name ?? 'someone who left';
		const called = id => (id === playerId ? 'You' : nameOf(id));
		const solo = winnerId === playerId ? 'You win the round' : `${nameOf(winnerId)} wins the round`;
		const winner = shared ? `${listNames(shared.map(called))} share the round` : solo;
		// How it was won: outright, by the tiebreak's vote, or still level after it
		const how =
			(shared && game.tiebreak && 'still tied after the tiebreak') ||
			(shared && `with ${votes(winningVotes)} each`) ||
			(game.tiebreak && 'by the tiebreak') ||
			`with ${votes(winningVotes)}`;
		const rewritten = result => (result?.original ? ` · rewritten by ${called(result.editedBy)}` : '');

		if (!card) {
			new Component({ tag: 'h2', addClass: 'headline', textContent: 'Nobody won that one', appendTo: this });
		} else {
			new Component(
				{ appendTo: this },
				new Component({ tag: 'h2', addClass: 'headline', textContent: winner }),
				new Component({
					addClass: 'tally',
					textContent: `${how}${rewritten(game.results?.find(result => result.playerId === winnerId))}`,
				}),
			);

			new Component(
				{ addClass: 'pair', appendTo: this },
				new Card({ type: 'black', style: { transform: tossed() }, innerHTML: game.black }),
				new Card({ type: 'white', style: { transform: tossed() }, innerHTML: card }),
			);
		}

		const rest = (game.results ?? []).filter(result => result.playerId !== winnerId);

		if (rest.length > 0) {
			const section = new Component({ tag: 'section', appendTo: this });

			new Component({ tag: 'h3', textContent: 'Also played', appendTo: section });
			rest.forEach(result => {
				new Component(
					{ addClass: 'played', appendTo: section },
					new Component({ addClass: 'text', innerHTML: result.card }),
					new Component({
						addClass: 'by',
						textContent: `${called(result.playerId)} · ${votes(result.votes)}${rewritten(result)}`,
					}),
				);
			});
		}

		const standings = new Component({ tag: 'section', appendTo: this });

		new Component({ tag: 'h3', textContent: 'Standings', appendTo: standings });
		new Scoreboard({ game, playerId, appendTo: standings });
	}
}
