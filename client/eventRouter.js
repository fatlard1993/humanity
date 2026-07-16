import { createClientEventRouter } from '@fatlard1993/web-game-framework/client';

const GAME_EVENTS = ['stageUpdate', 'addPlayer', 'removePlayer', 'playerUpdate', 'cardSelected'];

/**
 * Creates a client event router for a game, wiring shared game events to callbacks.
 * @param {string} gameId - The game to subscribe to
 * @param {object} [callbacks] - Event callbacks
 * @param {Function} [callbacks.onUpdate] - Called on any game state event
 * @param {Function} [callbacks.onPoke] - Called when this player is poked
 * @returns {object} The client event router
 */
export default function createGameRouter(gameId, { onUpdate, onPoke } = {}) {
	const router = createClientEventRouter({ gameId });

	for (const event of GAME_EVENTS) {
		router.on(event, () => onUpdate?.());
	}

	router.on('poke', data => onPoke?.(data));

	return router;
}
