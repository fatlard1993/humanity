import { log, dom, socketClient, humanity } from '_humanity';

const { init, setContent } = humanity;

const lobby = {
	state: {},
	draw: function () {
		const refresh = dom.createElem('button', { textContent: 'Refresh', onPointerPress: () => window.location.reload() });
		const newGame = dom.createElem('button', { id: 'newGame', textContent: 'New Game', onPointerPress: () => dom.location.change('/create') });

		humanity.setHeaderButtons(refresh, newGame);

		const roomList = dom.createElem('ul');
		const roomIds = Object.keys(this.state.rooms);

		if (!roomIds.length) {
			dom.createElem('li', { className: 'noGames', textContent: 'No Game Rooms Available', appendTo: roomList, onPointerPress: () => dom.location.change('/create') });
		} else {
			roomIds.forEach(id => {
				const room = this.state.rooms[id];
				const playerCount = dom.createElem('span', { className: 'playerCount', textContent: room.players });

				dom.createElem('li', {
					className: 'playerHTML',
					data: { name: room.name },
					innerHTML: room.name,
					appendChild: playerCount,
					appendTo: roomList,
					onPointerPress: () => dom.location.change(`/join/${id}`),
				});
			});
		}

		setContent(roomList);
	},
};

dom.onLoad(() => {
	socketClient.on('open', () => {
		socketClient.reply('join', { room: 'lobby' });
	});

	socketClient.on('state', function (state) {
		log()('[lobby] state', state);

		lobby.state = { ...lobby.state, ...state };

		lobby.draw();
	});

	dom.interact.on('keyUp', function (evt) {
		if (evt.keyPressed === 'ENTER') {
			evt.preventDefault();

			dom.location.change('/create');
		} else if (evt.keyPressed === 'ESCAPE') {
			evt.preventDefault();

			window.location.reload();
		}
	});

	init('Lobby');
});
