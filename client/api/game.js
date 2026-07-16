import { GET, POST } from '@vanilla-bean/hypertether';

export { getGames, getGame, createGame, joinGame } from '@fatlard1993/web-game-framework/client';

export const getPacks = async options => await GET('/packs', { apiId: 'packs', ...options });

export const getRandomName = async options => await GET('/packs/random-name', { cache: false, ...options });

export const readyUp = async ({ gameId, playerId }, options) =>
	await POST('/games/:gameId/:playerId/ready', {
		invalidates: ['games'],
		urlParameters: { gameId, playerId },
		...options,
	});

export const selectCard = async ({ gameId, playerId, selectedCard }, options) =>
	await POST('/games/:gameId/:playerId/selectCard', {
		invalidates: ['games'],
		urlParameters: { gameId, playerId },
		body: { selectedCard },
		...options,
	});

export const exitGame = async ({ gameId, playerId }, options) =>
	await POST('/games/:gameId/:playerId/exit', {
		invalidates: ['games'],
		urlParameters: { gameId, playerId },
		...options,
	});

export const pokePlayer = async ({ gameId, targetPlayerId }, options) =>
	await POST('/games/:gameId/poke', {
		cache: false,
		urlParameters: { gameId },
		body: { targetPlayerId },
		...options,
	});
