import { createClientEventRouter } from '@fatlard1993/web-game-framework/client';

const GAME_EVENTS = ['stageUpdate', 'addPlayer', 'removePlayer', 'playerUpdate', 'cardSelected'];

export default function createGameRouter(gameId, { onUpdate, onPoke } = {}) {
	const router = createClientEventRouter({ gameId });

	for (const event of GAME_EVENTS) {
		router.on(event, () => onUpdate?.());
	}

	router.on('poke', (data) => onPoke?.(data));

	return router;
}
