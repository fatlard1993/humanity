import { log, dom, util, socketClient, humanity } from '_humanity';

const { init, setHeaderButtons, setContent, setPageTitle, validateForm } = humanity;

const game = {
	room: {
		id: window.location.pathname.split('/')[2],
	},
	player: {
		id: window.location.pathname.split('/')[3],
	},
	draw: function (view) {
		delete this.waiting;

		if (!view && this.state.stage !== 'new' && this.player.state === 'done') view = 'waiting';

		this.view = view || this.state.stage;

		this.drawHeaderButtons(this.view);
		this[`draw_${this.view}`]();
	},
	drawHeaderButtons: function (view) {
		let right;
		const left = dom.createElem('button', {
			textContent: 'Leave',
			onPointerPress: () => dom.location.change('/lobby'),
		});

		if (view === 'new') {
			right = dom.createElem('button', {
				textContent: `${this.player.state === 'done' ? 'UN-' : ''}Ready`,
				onPointerPress: () => socketClient.reply('player_update', { state: this.player.state === 'done' ? 'joined' : 'done' }),
			});
		} else if (view === 'submissions') {
			right = dom.createElem('button', {
				id: 'submissionButton',
				disabled: true,
				textContent: 'Submit',
				onPointerPress: () => {
					if (this.room.options.editField) {
						if (validateForm()) return;

						socketClient.reply('player_update', { state: 'done', submission: dom.getElemById('submission').value });
					} else socketClient.reply('player_update', { state: 'done', submission: this.selectedCard });
				},
			});
		} else if (view === 'voting') {
			right = dom.createElem('button', {
				id: 'voteButton',
				textContent: 'Confirm Vote',
				disabled: true,
				onPointerPress: () => {
					socketClient.reply('player_update', { state: 'done', vote: this.player.vote });
				},
			});
		} else if ({ end: 1, scores: 1 }[view]) {
			right = dom.createElem('button', {
				textContent: 'Play Again',
				onPointerPress: () => dom.location.change(`/play/${this.room.id}/${this.player.id}`),
			});
		}

		setHeaderButtons(left, right);
	},
	draw_new: () => game.draw_waiting(),
	draw_waiting: function () {
		this.waiting = true;

		setPageTitle('Waiting...');

		const playersList = dom.createElem('ul', {
			id: 'playersList',
			appendChildren: util.cleanArr(
				this.state.playerNames.map(name => {
					const player = this.state.players[name];
					const isThisPlayer = player && player.id === this.player.id;

					if (!player || player.type === 'view' || player.state === 'inactive') return;

					return dom.createElem('li', {
						className: `playerHTML player${isThisPlayer ? '   disabled' : ''}${player.state === 'done' ? ' ready' : ''}`,
						innerHTML: name,
						appendChild: dom.createElem('img', { src: `https://avatars.dicebear.com/api/human/${player.id}.svg` }),
						onPointerPress: function () {
							if (isThisPlayer || player.state === 'done') return;

							socketClient.reply('player_nudge', { name });
						},
					});
				}),
			),
		});

		setContent(playersList);
	},
	draw_submissions: function () {
		const submission = dom.createElem('input', {
			id: 'submission',
			type: 'text',
			disabled: !this.room.options.editField,
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
			textContent: `${this.state.vetoVotes}/${this.state.activePlayers}`,
		});

		const vetoBlackButton = dom.createElem('button', {
			id: 'vetoBlackButton',
			onPointerPress: () => {
				socketClient.reply('player_update', { state: 'veto' });
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

		this.player.hand.forEach(card => {
			dom.createElem('li', {
				appendTo: hand,
				innerHTML: card,
				className: 'playerHTML',
				onPointerPress: ({ target }) => {
					const isSelected = target.classList.contains('selected');

					if (!isSelected) Array.from(document.querySelectorAll('ul#whitesList li.selected')).forEach(elem => elem.classList.remove('selected'));

					this.selectedCard = card;

					target.classList[isSelected ? 'remove' : 'add']('selected');

					if (this.room.options.editField) {
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
				this.room.options.submissionTimer && dom.createElem('div', { id: 'gameTimer' }),
				dom.createElem('div', {
					id: 'blackCard',
					innerHTML: this.state.black,
					className: 'playerHTML',
					appendChildren: Object.keys(this.state.submissions).length ? [] : [vetoBlackDisplay, vetoBlackButton],
				}),
				this.room.options.editField && dom.createElem('label', { textContent: 'Submission', appendChildren: [submission, clear] }),
				hand,
				// trashHand,
			]),
		});

		setPageTitle('Collecting Submissions');

		setContent(submissionForm);

		if (this.room.options.editField) submission.focus();
	},
	update_submissions: function () {
		if (Object.keys(this.state.submissions).length) {
			if (dom.getElemById('vetoBlackDisplay')) {
				dom.remove([dom.getElemById('vetoBlackButton'), dom.getElemById('vetoBlackDisplay')]);
			}

			return;
		}

		dom.getElemById('vetoBlackDisplay').textContent = `${this.state.vetoVotes}/${this.state.activePlayers}`;
	},
	draw_voting: function () {
		const fragment = document.createDocumentFragment();

		game.updateVoteButton = () => {
			dom.getElemById('voteButton')[`${document.querySelector('ul#whitesList li.selected') ? 'remove' : 'set'}Attribute`]('disabled', true);
		};

		if (this.room.options.voteTimer) dom.createElem('div', { appendTo: fragment, id: 'gameTimer' });

		dom.createElem('div', { className: 'playerHTML', appendTo: fragment, id: 'blackCard', innerHTML: this.state.black });

		dom.createElem('ul', {
			appendTo: fragment,
			id: 'whitesList',
			appendChildren: Object.keys(this.state.submissions).map(card => {
				return dom.createElem('li', {
					className: `playerHTML ${this.state.submissions[card] === this.player.id ? 'disabled' : ''}`,
					innerHTML: card,
					onPointerPress: ({ target }) => {
						if (target.classList.contains('disabled')) return;

						const isSelected = target.classList.contains('selected');

						if (!isSelected) Array.from(document.querySelectorAll('ul#whitesList li.selected')).forEach(elem => elem.classList.remove('selected'));

						this.player.vote = card;

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

		const fragment = document.createDocumentFragment();

		dom.createElem('div', { className: 'playerHTML', appendTo: fragment, id: 'blackCard', innerHTML: this.state.black });

		this.state.winners.forEach(winner => {
			dom.createElem('div', {
				appendTo: fragment,
				className: 'playerHTML whiteCard',
				innerHTML: winner.submission + '<br><br>-' + Object.keys(this.state.players).find(name => this.state.players[name].id === winner.player),
			});
		});

		dom.createElem('div', { appendTo: fragment, className: 'banner', textContent: `${this.state.gameOver ? 'Game' : 'Round'} Over` });

		if (this.state.winners.length > 1) dom.createElem('div', { appendTo: fragment, className: 'banner', textContent: 'TIE' });

		dom.createElem('ul', {
			appendTo: fragment,
			id: 'playersList',
			appendChildren: util.cleanArr(
				this.state.playerNames.map(name => {
					const player = this.state.players[name];
					const isThisPlayer = name === this.player.name;

					if (!player || player.type === 'view' || player.state === 'inactive') return;

					return dom.createElem('li', {
						className: `playerHTML player${isThisPlayer ? ' marked disabled' : ''}${player.state === 'done' ? ' ready' : ''}`,
						innerHTML: `${name}<br/><br/><p>Score: ${player.score}</p>`,
						appendChild: dom.createElem('img', { src: `https://avatars.dicebear.com/api/human/${player.id}.svg` }),
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

		return dom.location.change('/lobby');
	}

	log()(`[play] Game room: ${game.room.id}`);

	socketClient.on('open', function () {
		socketClient.reply('join_room', { room: 'play', gameRoom: game.room.id, player: game.player.id });
	});

	socketClient.on('join_room', function (payload) {
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
		if (payload.hand) game.player.hand = payload.hand;

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
		// if(game.waiting || !game.state || currentStage !== data.stage || !this[`update_${data.stage}`])

		// else if(this[`update_${data.stage}`]) this[`update_${data.stage}`]();
	});

	dom.interact.on('keyUp', evt => {
		if (evt.keyPressed === 'ENTER') {
			evt.preventDefault();

			if (game.view === 'new') {
				socketClient.reply('player_update', { state: game.player.state === 'done' ? 'joined' : 'done' });
			} else if (game.view === 'submissions') {
				if (game.room.options.editField) {
					if (validateForm()) return;

					socketClient.reply('player_update', { state: 'done', submission: dom.getElemById('submission').value });
				} else socketClient.reply('player_update', { state: 'done', submission: game.selectedCard });
			} else if (game.view === 'voting') {
				socketClient.reply('player_update', { state: 'done', vote: game.player.vote });
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
