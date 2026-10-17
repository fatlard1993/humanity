import { basicGameRoutes } from '@fatlard1993/web-game-framework/core';
import { hotReload, requestMatch, serveStatic } from '@vanilla-bean/components/app';

import gameRoutes from './game';

const gameCrudRoutes = basicGameRoutes();

const router = server => async request => {
	try {
		if (hotReload.upgrade(request, server.httpServer)) return;

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

		response = await serveStatic(request);
		if (response) return response;

		return new Response('Not Found', { status: 404 });
	} catch (error) {
		console.error('An error was encountered processing a request\n', error);

		return new Response('Server Error', { status: 500 });
	}
};
export default router;
