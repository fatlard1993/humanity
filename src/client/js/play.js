import { log, dom, util, socketClient, humanity } from '_humanity';

const { init, setHeaderButtons, setContent, setPageTitle, validateForm } = humanity;

const game = {
	localState: {},
	room: {
		id: window.location.pathname.split('/')[2],
	},
	player: {
		id: window.location.pathname.split('/')[3],
	},
	draw: function (view) {
		delete game.waiting;

		const { state, player } = game;

		if (!view && state.stage !== 'new' && player.state.status === 'done') view = 'waiting';

		game.view = view || state.stage;

		game.drawHeaderButtons(game.view);
		game[`draw_${game.view}`]();
	},
	drawHeaderButtons: function (view) {
		let right;
		const left = dom.createElem('button', {
			textContent: 'Leave',
			onPointerPress: () => dom.location.change('/lobby'),
		});

		const {
			room: { id: roomId, options },
			player: {
				id: playerId,
				state: { status },
			},
			localState,
		} = game;

		if (view === 'new') {
			right = dom.createElem('button', {
				textContent: `${status === 'done' ? 'UN-' : ''}Ready`,
				onPointerPress: () => socketClient.reply('player_update', { roomId, playerId, update: { status: status === 'done' ? 'joined' : 'done' } }),
			});
		} else if (view === 'submissions') {
			right = dom.createElem('button', {
				id: 'submissionButton',
				disabled: true,
				textContent: 'Submit',
				onPointerPress: () => {
					if (options.editField) {
						if (validateForm()) return;

						socketClient.reply('player_update', { roomId, playerId, update: { status: 'done', submission: dom.getElemById('submission').value } });
					} else socketClient.reply('player_update', { roomId, playerId, update: { status: 'done', submission: game.selectedCard } });
				},
			});
		} else if (view === 'voting') {
			right = dom.createElem('button', {
				id: 'voteButton',
				textContent: 'Confirm Vote',
				disabled: true,
				onPointerPress: () => {
					socketClient.reply('player_update', { roomId, playerId, update: { status: 'done', vote: localState.vote } });
				},
			});
		} else if ({ end: 1, scores: 1 }[view]) {
			right = dom.createElem('button', {
				textContent: 'Play Again',
				onPointerPress: () => dom.location.change(`/play/${roomId}/${playerId}`),
			});
		}

		setHeaderButtons(left, right);
	},
	draw_new: () => game.draw_waiting(),
	draw_waiting: function () {
		game.waiting = true;

		setPageTitle('Waiting...');

		const {
			state,
			player: { id: playerId },
		} = game;

		const playersList = dom.createElem('ul', {
			id: 'playersList',
			appendChildren: util.cleanArr(
				state.playerIds.map(id => {
					const player = state.players[id];
					const isThisPlayer = player?.id === playerId;

					if (!player || player.type === 'view' || player.state.status === 'inactive') return;

					return dom.createElem('li', {
						className: `playerHTML player${isThisPlayer ? '   disabled' : ''}${player.state.status === 'done' ? ' ready' : ''}`,
						innerHTML: player.name,
						appendChild: dom.createElem('img', { src: `https://avatars.dicebear.com/api/human/${id}.svg` }),
						onPointerPress: function () {
							if (isThisPlayer || player.state.status === 'done') return;

							socketClient.reply('player_nudge', { id });
						},
					});
				}),
			),
		});

		setContent(playersList);
	},
	draw_submissions: function () {
		const {
			room: { id: roomId, options },
			player: { id: playerId, state: playerState },
			state: gameState,
		} = game;

		const submission = dom.createElem('input', {
			id: 'submission',
			type: 'text',
			disabled: !options.editField,
			validation: /^.{3,256}$/,
			validationWarning: 'Must be between 3 and 256 characters',
			validate: 0,
		});

		game.updateSubmissionButton = () => {
			dom.getElemById('submissionButton')[`${submission.classList.contains('invalid') ? 'set' : 'remove'}Attribute`]('disabled', true);
		};

		const clear = dom.createElem('button', {
			className: 'iconAction clear',
			onPointerPress: () => {
				submission.value = '';

				Array.from(document.querySelectorAll('ul#whitesList li')).forEach(elem => elem.classList.remove('selected'));

				dom.validate(submission);

				game.updateSubmissionButton();
			},
		});

		const vetoBlackDisplay = dom.createElem('div', {
			id: 'vetoBlackDisplay',
			textContent: `${gameState.vetoVotes}/${gameState.activePlayers}`,
		});

		const vetoBlackButton = dom.createElem('button', {
			id: 'vetoBlackButton',
			onPointerPress: () => {
				socketClient.reply('player_update', { roomId, playerId, update: { status: 'veto' } });
			},
		});

		const hand = dom.createElem('ul', { id: 'whitesList' });

		// const trashHand = dom.createElem('button', {
		// 	id: 'trashWhites',
		// 	textContent: 'Trash Cards',
		// 	onPointerPress: () => {
		// 		log()('TRASH CARDS');
		// 	},
		// });

		playerState.hand.forEach(card => {
			dom.createElem('li', {
				appendTo: hand,
				innerHTML: card,
				className: 'playerHTML',
				onPointerPress: ({ target }) => {
					const isSelected = target.classList.contains('selected');

					if (!isSelected) Array.from(document.querySelectorAll('ul#whitesList li.selected')).forEach(elem => elem.classList.remove('selected'));

					game.selectedCard = card;

					target.classList[isSelected ? 'remove' : 'add']('selected');

					if (options.editField) {
						submission.value = card;

						dom.validate(submission);

						game.updateSubmissionButton();
					}
				},
			});
		});

		const submissionForm = dom.createElem('div', {
			id: 'form',
			appendChildren: util.cleanArr([
				options.submissionTimer && dom.createElem('div', { id: 'gameTimer' }),
				dom.createElem('div', {
					id: 'blackCard',
					innerHTML: gameState.black,
					className: 'playerHTML',
					appendChildren: Object.keys(gameState.submissions).length ? [] : [vetoBlackDisplay, vetoBlackButton],
				}),
				options.editField && dom.createElem('label', { textContent: 'Submission', appendChildren: [submission, clear] }),
				hand,
				// trashHand,
			]),
		});

		setPageTitle('Collecting Submissions');

		setContent(submissionForm);

		if (options.editField) submission.focus();
	},
	update_submissions: function () {
		const { state } = game;

		if (Object.keys(state.submissions).length) {
			if (dom.getElemById('vetoBlackDisplay')) {
				dom.remove([dom.getElemById('vetoBlackButton'), dom.getElemById('vetoBlackDisplay')]);
			}

			return;
		}

		dom.getElemById('vetoBlackDisplay').textContent = `${state.vetoVotes}/${state.activePlayers}`;
	},
	draw_voting: function () {
		const {
			state,
			room: { options },
			player,
		} = game;

		const fragment = document.createDocumentFragment();

		game.updateVoteButton = () => {
			dom.getElemById('voteButton')[`${document.querySelector('ul#whitesList li.selected') ? 'remove' : 'set'}Attribute`]('disabled', true);
		};

		if (options.voteTimer) dom.createElem('div', { appendTo: fragment, id: 'gameTimer' });

		dom.createElem('div', { className: 'playerHTML', appendTo: fragment, id: 'blackCard', innerHTML: state.black });

		dom.createElem('ul', {
			appendTo: fragment,
			id: 'whitesList',
			appendChildren: Object.keys(state.submissions).map(card => {
				return dom.createElem('li', {
					className: `playerHTML ${state.submissions[card] === player.id ? 'disabled' : ''}`,
					innerHTML: card,
					onPointerPress: ({ target }) => {
						if (target.classList.contains('disabled')) return;

						const isSelected = target.classList.contains('selected');

						if (!isSelected) Array.from(document.querySelectorAll('ul#whitesList li.selected')).forEach(elem => elem.classList.remove('selected'));

						game.localState.vote = card;

						target.classList[isSelected ? 'remove' : 'add']('selected');

						game.updateVoteButton();
					},
				});
			}),
		});

		setPageTitle('Collecting Votes');

		setContent(fragment);
	},
	draw_end: function () {
		socketClient.ws.close();

		const { state, player: thisPlayer } = game;

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
					const isThisPlayer = player.name === thisPlayer.name;

					if (!player || player.type === 'view' || player.state.status === 'inactive') return;

					return dom.createElem('li', {
						className: `playerHTML player${isThisPlayer ? ' marked disabled' : ''}${player.state.status === 'done' ? ' ready' : ''}`,
						innerHTML: `${player.name}<br/><br/><p>Score: ${player.state.score}</p>`,
						appendChild: dom.createElem('img', { src: `https://avatars.dicebear.com/api/human/${id}.svg` }),
					});
				}),
			),
		});

		setPageTitle('');

		setContent(fragment);
	},
};

dom.onLoad(function onLoad() {
	if (!game.room.id || !game.player.id) {
		log()(`[play] Missing player or room id: player=${game.player.id} room=${game.room.id} ... Returning to lobby`);

		// return dom.location.change('/lobby');
	}

	log()(`[play] Game room: ${game.room.id}`);

	socketClient.on('open', function () {
		socketClient.reply('join', { room: 'game', roomId: game.room.id, playerId: game.player.id });
	});

	socketClient.on('join', function (payload) {
		if (payload.error) {
			log()(`[play] Error joining room ... Returning to lobby`, payload);

			return dom.location.change('/lobby');
		}

		game.room.options = payload.options;
	});

	socketClient.on('player_submission', function (payload) {
		if (payload.error && game.room.options.editField) {
			dom.remove(document.getElementsByClassName('validationWarning'));

			dom.createElem('p', { className: 'validationWarning', textContent: payload.error, appendTo: dom.getElemById('submission').parentElement });

			dom.getElemById('submission').classList.remove('validated');
			dom.getElemById('submission').classList.add('invalid');
		}
	});

	socketClient.on('player_update', function (payload) {
		if (payload.id && payload.id !== game.player.id) return;

		log()('[play] player_update', payload);

		game.player.state = payload.state;

		if (game.state) game.draw();
	});

	socketClient.on('player_nudge', function (vibration = 200) {
		if (navigator.vibrate) navigator.vibrate(parseInt(vibration));
	});

	socketClient.on('game_update', function (data) {
		log()('[play] game_update', data);

		// const currentStage = game.state?.stage;

		game.state = data;

		game.draw();
		// if(game.waiting || !game.state || currentStage !== data.stage || !game[`update_${data.stage}`])

		// else if(game[`update_${data.stage}`]) game[`update_${data.stage}`]();
	});

	const {
		room: { id: roomId },
		player: { id: playerId },
		localState: { vote },
	} = game;

	dom.interact.on('keyUp', evt => {
		if (evt.keyPressed === 'ENTER') {
			evt.preventDefault();

			if (game.view === 'new') {
				socketClient.reply('player_update', { roomId, playerId, update: { status: game.player.state.status === 'done' ? 'joined' : 'done' } });
			} else if (game.view === 'submissions') {
				if (game.room.options.editField) {
					if (validateForm()) return;

					socketClient.reply('player_update', { roomId, playerId, update: { status: 'done', submission: dom.getElemById('submission').value } });
				} else socketClient.reply('player_update', { roomId, playerId, update: { status: 'done', submission: game.selectedCard } });
			} else if (game.view === 'voting') {
				socketClient.reply('player_update', { roomId, playerId, update: { status: 'done', vote } });
			} else if ({ end: 1, scores: 1 }[game.view]) {
				dom.location.change(`/play/${game.room.id}/${game.player.id}`);
			}
		} else if (evt.keyPressed === 'ESCAPE') {
			evt.preventDefault();

			dom.location.change('/lobby');
		}
	});

	init('Play');
});
