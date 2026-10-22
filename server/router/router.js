import { basicGameRoutes } from '@fatlard1993/web-game-framework/core';
import { serveApp } from '@vanilla-bean/components/app';

import gameRoutes from './game';

const gameCrudRoutes = basicGameRoutes();

// The game's routes, then the page and its files (the page revalidates; a game path no route took is a 404, not the
// page). The Server takes socket upgrades, game and page reload alike, before this is asked.
const router = server => async request =>
	(await gameRoutes(request, server)) ??
	(await gameCrudRoutes(request, server)) ??
	(await serveApp(request, { api: '/games/' })) ??
	new Response('Not Found', { status: 404 });

export default router;
