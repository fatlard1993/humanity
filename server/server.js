import router from './router';

export const clients = {};
export let url = '';

export const socketBroadcast = data => {
	console.log('broadcast', data);
	Object.values(clients).forEach(socket => {
		socket.send(JSON.stringify(data));
	});
};

export const init = async ({ port }) => {
	const server = Bun.serve({
		port,
		fetch: router,
		websocket: {
			open(socket) {
				clients[socket.data.clientId] = socket;
			},
			close(socket) {
				delete clients[socket.data.clientId];
			},
		},
	});

	url = server.url;

	console.log(`Listening on ${url}`);
};
