import requestMatch from '../utils/requestMatch';

import gameRoutes from './game';
import staticRoutes from './static';

const router = (server) => async (request) => {
	try {
		let match;
		let response;

		match = requestMatch('GET', '/', request);
		if (match) {
			const file = Bun.file('client/build/index.html');
			return new Response(await file.arrayBuffer(), { headers: { 'Content-Type': file.type } });
		}

		// WebSocket upgrade handled automatically by Server

		response = await gameRoutes(request, server);
		if (response) return response;

		response = await staticRoutes(request);
		if (response) return response;
	} catch (error) {
		console.error('An error was encountered processing a request\n', error);

		return new Response('Server Error', { status: 500 });
	}
};
export default router;
