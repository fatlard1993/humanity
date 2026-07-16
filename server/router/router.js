import { basicGameRoutes } from '@fatlard1993/web-game-framework/core';
import { requestMatch } from '@fatlard1993/web-game-framework/utils';

import gameRoutes from './game';
import staticRoutes from './static';

const gameCrudRoutes = basicGameRoutes();

const router = server => async request => {
	try {
		let response;

		const match = requestMatch('GET', '/', request);
		if (match) {
			const file = Bun.file('client/build/index.html');
			return new Response(await file.arrayBuffer(), { headers: { 'Content-Type': file.type } });
		}

		// WebSocket upgrade handled automatically by Server

		response = await gameRoutes(request, server);
		if (response) return response;

		response = await gameCrudRoutes(request, server);
		if (response) return response;

		response = await staticRoutes(request);
		if (response) return response;
	} catch (error) {
		console.error('An error was encountered processing a request\n', error);

		return new Response('Server Error', { status: 500 });
	}
};
export default router;
