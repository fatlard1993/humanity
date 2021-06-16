import { log, dom, socketClient, humanity } from '_humanity';

import util from 'js-util';

const { init, setPageTitle, setContent, setHeaderButtons } = humanity;

const view = {
	room: {
		id: window.location.pathname.split('/')[2],
	},
	draw: function () {
		const leave = dom.createElem('button', {
			textContent: 'Leave',
			onPointerPress: () => dom.location.change('/lobby'),
		});

		setHeaderButtons(leave);

		this[`draw_${this.state.stage}`]();
	},
	draw_new: () => view.draw_waiting(),
	draw_voting: () => view.draw_waiting(),
	draw_waiting: function () {
		this.waiting = true;

		setPageTitle('Waiting...');

		const playersList = dom.createElem('ul', {
			id: 'playersList',
			appendChildren: util.cleanArr(
				this.state.playerNames.map(name => {
					const player = this.state.players[name];

					if (!player || player.type === 'view' || player.state === 'inactive') return;

					return dom.createElem('li', {
						className: `player${player.state === 'done' ? ' ready' : ''}`,
						innerHTML: name,
						appendChild: dom.createElem('img', { src: `https://avatars.dicebear.com/api/human/${player.id}.svg` }),
						onPointerPress: function () {
							if (player.state === 'done') return;

							socketClient.reply('player_nudge', { name });
						},
					});
				}),
			),
		});

		setContent(playersList);
	},
	draw_submissions: function () {
		if (document.getElementById('whitesPile')) return;

		const fragment = document.createDocumentFragment();

		if (this.options.submissionTimer) dom.createElem('div', { appendTo: fragment, id: 'gameTimer' });

		dom.createElem('div', { id: 'blackCard', innerHTML: this.state.black, appendTo: fragment });
		dom.createElem('div', { id: 'whitesPile', appendTo: fragment });

		dom.maintenance.run();

		view.updateWhitesPile();

		setContent(fragment);
	},
	draw_end: function () {
		const fragment = document.createDocumentFragment();

		dom.createElem('div', { appendTo: fragment, id: 'blackCard', innerHTML: this.state.black });

		dom.createElem('div', { appendTo: fragment, className: 'banner', textContent: `${this.state.gameOver ? 'Game' : 'Round'} Over` });

		if (this.state.winners.length > 1) dom.createElem('div', { appendTo: fragment, className: 'banner', textContent: 'TIE' });

		this.state.winners.forEach(winner => {
			dom.createElem('div', {
				appendTo: fragment,
				className: 'whiteCard',
				innerHTML: winner.submission + '<br><br>-' + Object.keys(this.state.players).find(name => this.state.players[name].id === winner.player),
			});
		});

		dom.createElem('ul', {
			appendTo: fragment,
			id: 'playersList',
			appendChildren: this.state.playerNames.map(name => {
				const player = this.state.players[name];
				const isThisPlayer = name === this.player.name;

				if (!player || player.type === 'view' || player.state === 'inactive') return;

				return dom.createElem('li', {
					className: `player${isThisPlayer ? ' marked disabled' : ''}${player.state === 'done' ? ' ready' : ''}`,
					innerHTML: `${name}<br/><br/><p>Score: ${player.score}</p>`,
					appendChild: dom.createElem('img', { src: `https://avatars.dicebear.com/api/human/${player.id}.svg` }),
				});
			}),
		});

		setContent(fragment);
	},
	updateWhitesPile: function (newSubmissions) {
		var whitesPile = document.getElementById('whitesPile');

		if (!whitesPile) return;

		log()('newSubmissions', newSubmissions);

		for (var x = newSubmissions ? 0 : whitesPile.children.length, count = (newSubmissions || Object.keys(view.state.submissions)).length; x < count; ++x) {
			(function (x) {
				var card = dom.createElem('div', { textContent: newSubmissions ? newSubmissions[x] : view.state.submissions[Object.keys(view.state.submissions)[x]], appendTo: whitesPile });

				setTimeout(function () {
					card.style.top = util.rand(5, 40) + '%';
					card.style.left = util.rand(5, 80) + '%';
					card.style.transform = 'rotate(' + util.rand(-30, 70) + 'deg)';
					// dom.setTransform(card, `translate(${util.rand(5, 40)}%, ${util.rand(5, 80)}%) rotate(${util.rand(-30, 70)}deg)`);
				}, 20);
			})(x);
		}
	},
	whitesPileFix: function () {
		if (!document.getElementById('whitesPile')) return;

		var height = dom.availableHeight - document.getElementById('blackCard').clientHeight - 100;

		document.getElementById('whitesPile').style.height = height + 'px';
	},
};

dom.onLoad(function onLoad() {
	if (!view.room.id) {
		log()(`[play] Missing room id: room=${view.room.id} ... Returning to lobby`);

		return dom.location.change('/lobby');
	}

	log()(`[view] View room: ${view.room.id}`);

	socketClient.on('open', function () {
		socketClient.reply('join_room', { room: 'view', gameRoom: view.room.id });
	});

	socketClient.on('join_room', function (payload) {
		if (payload.error) {
			log()(`[view] Error joining room ... Returning to lobby`, view.room, payload);

			return dom.location.change('/lobby');
		}

		view.room.options = payload.options;
	});

	socketClient.on('player_submission', function (payload) {
		log()('[view] player_submission', payload);
	});

	socketClient.on('player_update', function (payload) {
		log()('[view] player_update', payload);
	});

	socketClient.on('game_update', function (data) {
		log()('[view] game_update', data);

		var newSubmissions = [];

		if (view.state && view.state.submissions)
			Object.keys(data.submissions).forEach(submission => {
				if (!view.state.submissions[submission]) newSubmissions.push(data.submissions[submission]);
			});

		if (!newSubmissions.length) newSubmissions = undefined;

		view.state = data;

		if (document.getElementById('whitesPile') && view.state.stage === 'submissions') view.updateWhitesPile(newSubmissions);
		else if (!document.getElementById('whitesList') && view.state.stage === 'voting')
			setTimeout(() => {
				view.draw();
			}, 2000);
		else view.draw();
	});

	dom.interact.on('keyUp', evt => {
		if (evt.keyPressed === 'ESCAPE') {
			evt.preventDefault();

			dom.location.change('/lobby');
		}
	});

	dom.maintenance.init([view.whitesPileFix]);

	init('View');
});
