import { log, dom, socketClient, humanity } from '_humanity';

import util from 'js-util';

const { init, setPageTitle, setContent, setHeaderButtons } = humanity;

const game = {
	localState: {},
	room: {
		id: window.location.pathname.split('/')[2],
	},
	player: {
		id: window.location.pathname.split('/')[3],
	},
	draw: view => {
		const { state } = game;

		const leave = dom.createElem('button', {
			textContent: 'Leave',
			onPointerPress: () => dom.location.change('/lobby'),
		});

		setHeaderButtons(leave);

		game.view = view || state.stage;

		game[`draw_${game.view}`]();
	},
	draw_new: () => game.draw_waiting(),
	draw_waiting: () => {
		setPageTitle(`Waiting${{ new: ' to begin', voting: ' for votes' }[game.view] || ''}...`);

		const { state } = game;

		const playersList = dom.createElem('ul', {
			id: 'playersList',
			appendChildren: util.cleanArr(
				state.playerIds.map(id => {
					const player = state.players[id];

					if (!player || player.type === 'watch' || player.state.status === 'inactive') return;

					return dom.createElem('li', {
						className: `playerHTML player${player.state.status === 'done' ? ' ready' : ''}`,
						innerHTML: player.name,
						appendChild: dom.createElem('img', { src: `https://avatars.dicebear.com/api/human/${id}.svg` }),
						onPointerPress: () => {
							if (player.state.status === 'done') return;

							socketClient.reply('player_nudge', { id });
						},
					});
				}),
			),
		});

		setContent(playersList);
	},
	draw_submissions: () => {
		const whitesPile = document.getElementById('whitesPile');

		if (whitesPile) return game.update_submissions();

		const {
			room: { options },
			state,
		} = game;

		game.localState.shownSubmissionIds = [];

		const fragment = document.createDocumentFragment();

		if (options.submissionTimer) dom.createElem('div', { appendTo: fragment, id: 'gameTimer' });

		dom.createElem('div', { id: 'blackCard', innerHTML: state.black, appendTo: fragment });
		dom.createElem('div', { id: 'whitesPile', appendTo: fragment });

		dom.maintenance.run();

		setContent(fragment);

		game.update_submissions();

		setPageTitle('');
	},
	update_submissions: () => {
		const whitesPile = document.getElementById('whitesPile');

		if (!whitesPile) return;

		const { state, localState } = game;

		const blackCard = document.getElementById('blackCard');

		blackCard.innerHTML = state.black;

		const submissionIds = Object.keys(state.submissions)
			.filter(submission => !localState.shownSubmissionIds.includes(state.submissions[submission]))
			.map(submission => state.submissions[submission]);

		log()('update_submissions', submissionIds);

		submissionIds.forEach(playerId => {
			const card = dom.createElem('div', { appendChild: dom.createElem('img', { src: `https://avatars.dicebear.com/api/human/${playerId}.svg` }), appendTo: whitesPile });

			game.localState.shownSubmissionIds.push(playerId);

			setTimeout(() => {
				card.style.top = util.rand(5, 40) + '%';
				card.style.left = util.rand(5, 80) + '%';
				card.style.transform = 'rotate(' + util.rand(-30, 70) + 'deg)';
				// dom.setTransform(card, `translate(${util.rand(5, 40)}%, ${util.rand(5, 80)}%) rotate(${util.rand(-30, 70)}deg)`);
			}, 20);
		});
	},
	draw_voting: () => game.draw_waiting(),
	draw_end: () => {
		const { state } = game;

		const fragment = document.createDocumentFragment();

		dom.createElem('div', { className: 'playerHTML', appendTo: fragment, id: 'blackCard', innerHTML: state.black });

		state.winners.forEach(winner => {
			dom.createElem('div', {
				appendTo: fragment,
				className: 'playerHTML whiteCard',
				innerHTML: winner.submission + '<br><br>-' + state.players[Object.keys(state.players).find(id => id === winner.player)].name,
			});
		});

		dom.createElem('div', { appendTo: fragment, className: 'banner', textContent: `${state.gameOver ? 'Game' : 'Round'} Over` });

		if (state.winners.length > 1) dom.createElem('div', { appendTo: fragment, className: 'banner', textContent: 'TIE' });

		dom.createElem('ul', {
			appendTo: fragment,
			id: 'playersList',
			appendChildren: util.cleanArr(
				state.playerIds.map(id => {
					const player = state.players[id];

					if (!player || player.type === 'watch' || player.state.status === 'inactive') return;

					return dom.createElem('li', {
						className: `playerHTML player${player.state.status === 'done' ? ' ready' : ''}`,
						innerHTML: `${player.name}<br/><br/><p>Score: ${player.state.score}</p>`,
						appendChild: dom.createElem('img', { src: `https://avatars.dicebear.com/api/human/${id}.svg` }),
					});
				}),
			),
		});

		setPageTitle('');

		setContent(fragment);
	},
	whitesPileFix: () => {
		if (!document.getElementById('whitesPile')) return;

		const height = dom.availableHeight - document.getElementById('blackCard').clientHeight - 100;

		document.getElementById('whitesPile').style.height = height + 'px';
	},
};

dom.onLoad(() => {
	const {
		room: { id: roomId },
		player: { id: playerId },
	} = game;

	if (!roomId) {
		log()(`[play] Missing room id ... Returning to lobby`);

		return dom.location.change('/lobby');
	}

	log()(`[watch] Watch room: ${roomId}`);

	socketClient.on('open', () => {
		socketClient.reply('join', { room: 'game', roomId, playerId });
	});

	socketClient.on('join', payload => {
		if (payload.error) {
			log()(`[play] Error joining room ... Returning to room ${roomId}`, payload);

			return dom.location.change(`/join/${roomId}`);
		}

		game.room.options = payload.options;
	});

	socketClient.on('player_submission', payload => {
		log()('[watch] player_submission', payload);
	});

	socketClient.on('player_update', payload => {
		log()('[watch] player_update', payload);
	});

	socketClient.on('player_nudge', (vibration = 200) => {
		log()('[watch] player_nudge', vibration);
	});

	socketClient.on('game_update', data => {
		log()('[watch] game_update', data);

		const lastStage = game?.state?.stage;

		game.state = data;

		if (lastStage === 'submissions' && game.state.stage === 'voting') setTimeout(() => game.draw(), 2000);
		else game.draw();
	});

	dom.interact.on('keyUp', evt => {
		if (evt.keyPressed === 'ESCAPE') {
			evt.preventDefault();

			dom.location.change('/lobby');
		}
	});

	dom.maintenance.init([game.whitesPileFix]);

	init('Watch');
});
