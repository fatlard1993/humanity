import { GET, POST } from 'vanilla-bean-components';

export const getPacks = async options => await GET('/packs', { id: 'packs', ...options });

export const getGames = async options => await GET('/games', { id: 'games', ...options });

export const getGame = async (id, options) =>
	await GET('/games/:id', { id: ['games', id], urlParameters: { id }, ...options });

export const createGame = async options => await POST('/games', { invalidates: ['games'], ...options });

export const joinGame = async (id, options) =>
	await POST('/games/:id/join', { invalidates: ['games'], urlParameters: { id }, ...options });

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
