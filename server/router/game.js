import requestMatch from '../utils/requestMatch';
import cards from '../cards.js';
import Game from '../game.js';

const _game = async (request, server) => {
	let match;

	match = requestMatch('GET', '/packs', request);
	if (match) return Response.json(Object.keys(cards.db));

	match = requestMatch('GET', '/packs/random-name', request);
	if (match) {
		if (!cards._shortWhites) {
			const htmlTag = /<[^>]+>/;
			cards._shortWhites = Object.values(cards.db)
				.flatMap(pack => pack.data.whites || [])
				.filter(card => {
					const words = card.trim().split(/\s+/);
					return words.length <= 3 && !htmlTag.test(card) && card.length <= 30;
				});
		}

		const name = cards._shortWhites[Math.floor(Math.random() * cards._shortWhites.length)];
		return Response.json(name);
	}

	match = requestMatch('GET', '/games', request);
	if (match) return Response.json(Object.values(server.games).map(game => game.toClient()));

	match = requestMatch('GET', '/games/:gameId', request);
	if (match) {
		const game = server.games[match.gameId];

		if (!game) return Response.json({ message: `Could not find game "${match.gameId}"` }, { status: 404 });

		return Response.json(game.toClient());
	}

	match = requestMatch('POST', '/games', request);
	if (match) {
		const game = new Game({ server, ...await request.json() });

		return Response.json(game.toClient(), { status: 201 });
	}

	match = requestMatch('POST', '/games/:gameId/join', request);
	if (match) {
		const body = await request.json();
		const { gameId } = match;
		const { playerId, name } = body;
		const game = server.games[gameId];

		if (!game) return Response.json({ message: `Could not find game "${gameId}"` }, { status: 404 });

		if (playerId && game.players.has(playerId)) {
			if (game.stage === 'end') game.updateGameStage('wait');

			return Response.json(game.updatePlayer(playerId, { stage: 'play' }), { status: 200 });
		}

		const newPlayer = game.addPlayer(name);

		return Response.json(newPlayer, { status: 201 });
	}

	match = requestMatch('POST', '/games/:gameId/:playerId/ready', request);
	if (match) {
		const { gameId, playerId } = match;

		if (!playerId || !server.games[gameId]?.players?.has(playerId)) {
			return Response.json({ message: `Could not find player "${playerId}"` }, { status: 404 });
		}

		const player = server.games[gameId].updatePlayer(playerId, { stage: 'play' });

		return Response.json({ ...player }, { status: 200 });
	}

	match = requestMatch('POST', '/games/:gameId/:playerId/selectCard', request);
	if (match) {
		const body = await request.json();
		const { gameId, playerId } = match;
		const { selectedCard } = body;

		if (!playerId || !server.games[gameId]?.players?.has(playerId)) {
			return Response.json({ message: `Could not find player "${playerId}"` }, { status: 404 });
		}

		// TODO add validations for selected card:
		// if stage = play card must exist in players hand
		// if stage = vote card must exist in submissions

		const updatedPlayer = server.games[gameId].updatePlayer(playerId, { selectedCard });

		return Response.json({ ...updatedPlayer }, { status: 200 });
	}

	match = requestMatch('POST', '/games/:gameId/poke', request);
	if (match) {
		const { gameId } = match;
		const { targetPlayerId } = await request.json();
		const game = server.games[gameId];

		if (!game) return Response.json({ message: `Could not find game "${gameId}"` }, { status: 404 });

		const target = game.players.get(targetPlayerId);
		if (!target) return Response.json({ message: `Could not find player "${targetPlayerId}"` }, { status: 404 });

		game.broadcast('poke', { targetPlayerId, targetPlayerName: target.name });

		return Response.json({ ok: true });
	}

	match = requestMatch('POST', '/games/:gameId/:playerId/exit', request);
	if (match) {
		const { gameId, playerId } = match;

		if (!playerId || !server.games[gameId]?.players?.has(playerId)) {
			return Response.json({ message: `Could not find player "${playerId}"` }, { status: 404 });
		}

		const removedPlayerId = server.games[gameId].removePlayer(playerId);

		return Response.json({ id: removedPlayerId }, { status: 200 });
	}
};

export default _game;
