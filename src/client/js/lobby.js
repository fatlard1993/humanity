import { log, dom, socketClient, humanity } from '_humanity';

const { init, setContent } = humanity;

const lobby = {
	draw: function () {
		const refresh = dom.createElem('button', { textContent: 'Refresh', onPointerPress: () => window.location.reload() });
		const newGame = dom.createElem('button', { id: 'newGame', textContent: 'New Game', onPointerPress: () => dom.location.change('/create') });

		humanity.setHeaderButtons(refresh, newGame);

		const roomList = dom.createElem('ul');
		const roomIDs = Object.keys(this.rooms);

		if (!roomIDs.length) {
			dom.createElem('li', { className: 'noGames', textContent: 'No Game Rooms Available', appendTo: roomList, onPointerPress: () => dom.location.change('/create') });
		} else {
			roomIDs.forEach(id => {
				const room = lobby.rooms[id];
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

dom.onLoad(function onLoad() {
	socketClient.on('open', function () {
		socketClient.reply('join_room', { room: 'lobby' });
	});

	socketClient.on('state', function (data) {
		log()('[lobby] state', data);

		if (data.rooms) {
			lobby.rooms = data.rooms;

			lobby.draw();
		}
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
