import requestMatch from '../utils/requestMatch';
import cards from '../cards';
import Game from '../game';

const games = {};

const _game = async request => {
	let match;

	match = requestMatch('GET', '/packs', request);
	if (match) return Response.json(Object.keys(cards.db));

	match = requestMatch('GET', '/games', request);
	if (match) return Response.json(Object.values(games).map(game => game.toClient()));

	match = requestMatch('GET', '/games/:gameId', request);
	if (match) {
		const game = games[match.gameId];

		if (!game) return Response.json({ message: `Could not find game "${match.gameId}"` }, { status: 404 });

		return Response.json(game.toClient());
	}

	match = requestMatch('POST', '/games', request);
	if (match) {
		const game = new Game(await request.json());

		games[game.id] = game;

		return Response.json(game, { status: 201 });
	}

	match = requestMatch('POST', '/games/:gameId/join', request);
	if (match) {
		const body = await request.json();
		const { gameId } = match;
		const { playerId, name } = body;
		const game = games[gameId];

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

		if (!playerId || !games[gameId]?.players?.has(playerId)) {
			return Response.json({ message: `Could not find player "${playerId}"` }, { status: 404 });
		}

		return Response.json(games[gameId].updatePlayer(playerId, { stage: 'play' }), { status: 200 });
	}

	match = requestMatch('POST', '/games/:gameId/:playerId/selectCard', request);
	if (match) {
		const body = await request.json();
		const { gameId, playerId } = match;
		const { selectedCard } = body;

		if (!playerId || !games[gameId]?.players?.has(playerId)) {
			return Response.json({ message: `Could not find player "${playerId}"` }, { status: 404 });
		}

		// TODO add validations for selected card:
		// if stage = play card must exist in players hand
		// if stage = vote card must exist in submissions

		return Response.json(games[gameId].updatePlayer(playerId, { selectedCard }), { status: 200 });
	}

	match = requestMatch('POST', '/games/:gameId/:playerId/exit', request);
	if (match) {
		const { gameId, playerId } = match;

		if (!playerId || !games[gameId]?.players?.has(playerId)) {
			return Response.json({ message: `Could not find player "${playerId}"` }, { status: 404 });
		}

		return Response.json(games[gameId].removePlayer(playerId), { status: 200 });
	}
};

export default _game;
